using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Services;

public sealed class SpotifyUsersCurrentlyPlayingPoller(
    IServiceScopeFactory scopeFactory,
    ISpotifyService spotifyService,
    ISpotifyTokenProtector tokenProtector,
    ISpotifyUserNowPlayingCache cache,
    IOptions<SpotifyUserPollingOptions> optionsAccessor,
    ILogger<SpotifyUsersCurrentlyPlayingPoller> logger) : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;
    private readonly ISpotifyService _spotifyService = spotifyService;
    private readonly ISpotifyTokenProtector _tokenProtector = tokenProtector;
    private readonly ISpotifyUserNowPlayingCache _cache = cache;
    private readonly SpotifyUserPollingOptions _options = optionsAccessor.Value;
    private readonly ILogger<SpotifyUsersCurrentlyPlayingPoller> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Spotify user polling is disabled.");
            return;
        }

        var pollInterval = TimeSpan.FromSeconds(Math.Clamp(_options.PollIntervalSeconds, 5, 180));
        var delayBetweenUsers = TimeSpan.FromMilliseconds(Math.Clamp(_options.RequestDelayMilliseconds, 0, 5000));
        var maxUsersPerCycle = Math.Clamp(_options.MaxUsersPerCycle, 1, 5000);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollUsersAsync(maxUsersPerCycle, delayBetweenUsers, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Spotify polling cycle failed.");
            }

            await Task.Delay(pollInterval, stoppingToken);
        }
    }

    private async Task PollUsersAsync(int maxUsersPerCycle, TimeSpan delayBetweenUsers, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var users = await db.Users
            .Where(u => !string.IsNullOrWhiteSpace(u.SpotifyRefreshToken))
            .OrderByDescending(u => u.SpotifyConnectedAtUtc)
            .Take(maxUsersPerCycle)
            .ToListAsync(cancellationToken);

        var hasUpdates = false;

        foreach (var user in users)
        {
            var (snapshot, updated, retryAfterSeconds) = await ResolveSnapshotForUserAsync(user, cancellationToken);
            _cache.Upsert(snapshot);
            hasUpdates |= updated;

            if (retryAfterSeconds.HasValue && retryAfterSeconds.Value > 0)
            {
                var retryDelay = TimeSpan.FromSeconds(Math.Clamp(retryAfterSeconds.Value, 1, 300));
                _logger.LogWarning(
                    "Spotify rate limit reached while polling user {UserId}. Backing off for {RetryAfterSeconds} seconds.",
                    user.Id,
                    retryDelay.TotalSeconds);
                await Task.Delay(retryDelay, cancellationToken);
            }

            if (delayBetweenUsers > TimeSpan.Zero)
            {
                await Task.Delay(delayBetweenUsers, cancellationToken);
            }
        }

        if (hasUpdates)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<(SpotifyUserNowPlayingSnapshot Snapshot, bool UpdatedUser, int? RetryAfterSeconds)> ResolveSnapshotForUserAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var refreshToken = _tokenProtector.Unprotect(user.SpotifyRefreshToken);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return (
                new SpotifyUserNowPlayingSnapshot(
                    UserId: user.Id,
                    IsConnected: false,
                    IsPlaying: false,
                    TrackName: null,
                    Artists: null,
                    AlbumName: null,
                    AlbumImageUrl: null,
                    SpotifyTrackUrl: null,
                    LastUpdatedUtc: now,
                    ErrorMessage: "Missing or invalid Spotify refresh token."),
                false,
                null);
        }

        var updatedUser = false;
        var isConnected = true;
        var accessToken = _tokenProtector.Unprotect(user.SpotifyAccessToken);

        if (string.IsNullOrWhiteSpace(accessToken) ||
            !user.SpotifyTokenExpiresAtUtc.HasValue ||
            user.SpotifyTokenExpiresAtUtc.Value <= now)
        {
            var refreshResult = await _spotifyService.RefreshAccessTokenAsync(refreshToken, cancellationToken);
            if (!refreshResult.IsSuccess ||
                string.IsNullOrWhiteSpace(refreshResult.AccessToken) ||
                !refreshResult.ExpiresAtUtc.HasValue)
            {
                if (refreshResult.RequiresReconnect)
                {
                    isConnected = false;
                    ClearSpotifyTokens(user);
                    updatedUser = true;
                }

                return (
                    new SpotifyUserNowPlayingSnapshot(
                        UserId: user.Id,
                        IsConnected: isConnected,
                        IsPlaying: false,
                        TrackName: null,
                        Artists: null,
                        AlbumName: null,
                        AlbumImageUrl: null,
                        SpotifyTrackUrl: null,
                        LastUpdatedUtc: DateTime.UtcNow,
                        ErrorMessage: refreshResult.ErrorMessage),
                    updatedUser,
                    null);
            }

            user.SpotifyAccessToken = _tokenProtector.Protect(refreshResult.AccessToken);
            user.SpotifyRefreshToken = _tokenProtector.Protect(refreshResult.RefreshToken ?? refreshToken);
            user.SpotifyTokenExpiresAtUtc = refreshResult.ExpiresAtUtc.Value;
            user.SpotifyConnectedAtUtc ??= now;
            updatedUser = true;
            accessToken = refreshResult.AccessToken;
            refreshToken = refreshResult.RefreshToken ?? refreshToken;
        }

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return (
                new SpotifyUserNowPlayingSnapshot(
                    UserId: user.Id,
                    IsConnected: false,
                    IsPlaying: false,
                    TrackName: null,
                    Artists: null,
                    AlbumName: null,
                    AlbumImageUrl: null,
                    SpotifyTrackUrl: null,
                    LastUpdatedUtc: DateTime.UtcNow,
                    ErrorMessage: "Missing Spotify access token."),
                updatedUser,
                null);
        }

        var nowPlayingResult = await _spotifyService.GetCurrentlyPlayingAsync(accessToken, cancellationToken);
        if (nowPlayingResult.Unauthorized)
        {
            var refreshResult = await _spotifyService.RefreshAccessTokenAsync(refreshToken, cancellationToken);
            if (!refreshResult.IsSuccess ||
                string.IsNullOrWhiteSpace(refreshResult.AccessToken) ||
                !refreshResult.ExpiresAtUtc.HasValue)
            {
                if (refreshResult.RequiresReconnect)
                {
                    isConnected = false;
                    ClearSpotifyTokens(user);
                    updatedUser = true;
                }

                return (
                    new SpotifyUserNowPlayingSnapshot(
                        UserId: user.Id,
                        IsConnected: isConnected,
                        IsPlaying: false,
                        TrackName: null,
                        Artists: null,
                        AlbumName: null,
                        AlbumImageUrl: null,
                        SpotifyTrackUrl: null,
                        LastUpdatedUtc: DateTime.UtcNow,
                        ErrorMessage: refreshResult.ErrorMessage),
                    updatedUser,
                    null);
            }

            user.SpotifyAccessToken = _tokenProtector.Protect(refreshResult.AccessToken);
            user.SpotifyRefreshToken = _tokenProtector.Protect(refreshResult.RefreshToken ?? refreshToken);
            user.SpotifyTokenExpiresAtUtc = refreshResult.ExpiresAtUtc.Value;
            user.SpotifyConnectedAtUtc ??= now;
            updatedUser = true;
            nowPlayingResult = await _spotifyService.GetCurrentlyPlayingAsync(refreshResult.AccessToken, cancellationToken);
        }

        if (!nowPlayingResult.IsSuccess)
        {
            return (
                    new SpotifyUserNowPlayingSnapshot(
                        UserId: user.Id,
                        IsConnected: isConnected,
                        IsPlaying: false,
                    TrackName: null,
                    Artists: null,
                    AlbumName: null,
                    AlbumImageUrl: null,
                        SpotifyTrackUrl: null,
                        LastUpdatedUtc: DateTime.UtcNow,
                        ErrorMessage: nowPlayingResult.ErrorMessage),
                    updatedUser,
                    nowPlayingResult.RetryAfterSeconds);
        }

        return (
            new SpotifyUserNowPlayingSnapshot(
                UserId: user.Id,
                IsConnected: isConnected,
                IsPlaying: nowPlayingResult.IsPlaying,
                TrackName: nowPlayingResult.TrackName,
                Artists: nowPlayingResult.Artists,
                AlbumName: nowPlayingResult.AlbumName,
                AlbumImageUrl: nowPlayingResult.AlbumImageUrl,
                SpotifyTrackUrl: nowPlayingResult.SpotifyTrackUrl,
                LastUpdatedUtc: DateTime.UtcNow,
                ErrorMessage: nowPlayingResult.ErrorMessage),
            updatedUser,
            null);
    }

    private static void ClearSpotifyTokens(User user)
    {
        user.SpotifyAccessToken = null;
        user.SpotifyRefreshToken = null;
        user.SpotifyTokenExpiresAtUtc = null;
        user.SpotifyConnectedAtUtc = null;
    }
}
