using Microsoft.Extensions.Options;
using SpotifyAPI.Web;
using Microsoft.EntityFrameworkCore;
using Seniors2027.DAL.Data;

namespace Seniors2027.API.Services;

public sealed class SpotifyDevCurrentlyPlayingPoller(
    IOptions<SpotifyDevPollingOptions> optionsAccessor,
    ISpotifyNowPlayingSnapshotStore snapshotStore,
    IServiceScopeFactory scopeFactory,
    ILogger<SpotifyDevCurrentlyPlayingPoller> logger) : BackgroundService
{
    private readonly SpotifyDevPollingOptions _options = optionsAccessor.Value;
    private readonly ISpotifyNowPlayingSnapshotStore _snapshotStore = snapshotStore;
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;
    private readonly ILogger<SpotifyDevCurrentlyPlayingPoller> _logger = logger;
    private readonly OAuthClient _oauthClient = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!TryValidateConfiguration(_options, out var configurationError))
        {
            _snapshotStore.SetSnapshot(new SpotifyNowPlayingSnapshot(
                IsConfigured: false,
                IsConnected: false,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                LastUpdatedUtc: DateTime.UtcNow,
                ErrorMessage: configurationError));

            _logger.LogWarning("Spotify dev poller disabled: {Reason}", configurationError);
            return;
        }

        var pollInterval = TimeSpan.FromSeconds(Math.Clamp(_options.PollIntervalSeconds, 2, 60));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollNowPlayingAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (APIException apiEx)
            {
                _logger.LogWarning(apiEx, "Spotify API polling error.");
                _snapshotStore.SetSnapshot(new SpotifyNowPlayingSnapshot(
                    IsConfigured: true,
                    IsConnected: false,
                    IsPlaying: false,
                    TrackName: null,
                    Artists: null,
                    AlbumName: null,
                    AlbumImageUrl: null,
                    SpotifyTrackUrl: null,
                    LastUpdatedUtc: DateTime.UtcNow,
                    ErrorMessage: $"Spotify API error: {apiEx.Message}"));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Spotify polling failed.");
                _snapshotStore.SetSnapshot(new SpotifyNowPlayingSnapshot(
                    IsConfigured: true,
                    IsConnected: false,
                    IsPlaying: false,
                    TrackName: null,
                    Artists: null,
                    AlbumName: null,
                    AlbumImageUrl: null,
                    SpotifyTrackUrl: null,
                    LastUpdatedUtc: DateTime.UtcNow,
                    ErrorMessage: "Polling failed. Check server logs."));
            }

            await Task.Delay(pollInterval, stoppingToken);
        }
    }

    private async Task PollNowPlayingAsync(CancellationToken cancellationToken)
    {
        var refreshToken = await ResolveRefreshTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            _snapshotStore.SetSnapshot(new SpotifyNowPlayingSnapshot(
                IsConfigured: true,
                IsConnected: false,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                LastUpdatedUtc: DateTime.UtcNow,
                ErrorMessage: "No refresh token available. Connect Spotify once, or set SpotifyDevPolling:RefreshToken."));
            return;
        }

        var tokenResponse = await _oauthClient.RequestToken(
            new AuthorizationCodeRefreshRequest(
                _options.ClientId!,
                _options.ClientSecret!,
                refreshToken));

        var spotify = new SpotifyClient(tokenResponse.AccessToken);
        var currentlyPlaying = await spotify.Player.GetCurrentlyPlaying(new PlayerCurrentlyPlayingRequest
        {
            Market = string.IsNullOrWhiteSpace(_options.Market) ? "from_token" : _options.Market
        });

        if (currentlyPlaying?.Item is not FullTrack track || !currentlyPlaying.IsPlaying)
        {
            _snapshotStore.SetSnapshot(new SpotifyNowPlayingSnapshot(
                IsConfigured: true,
                IsConnected: true,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                LastUpdatedUtc: DateTime.UtcNow,
                ErrorMessage: null));
            return;
        }

        var artists = track.Artists is null
            ? null
            : string.Join(", ", track.Artists
                .Select(a => a.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name)));

        var albumImageUrl = track.Album?.Images?.FirstOrDefault()?.Url;
        string? trackUrl = null;
        if (track.ExternalUrls is not null &&
            track.ExternalUrls.TryGetValue("spotify", out var externalSpotifyUrl))
        {
            trackUrl = externalSpotifyUrl;
        }

        _snapshotStore.SetSnapshot(new SpotifyNowPlayingSnapshot(
            IsConfigured: true,
            IsConnected: true,
            IsPlaying: true,
            TrackName: track.Name,
            Artists: artists,
            AlbumName: track.Album?.Name,
            AlbumImageUrl: albumImageUrl,
            SpotifyTrackUrl: trackUrl,
            LastUpdatedUtc: DateTime.UtcNow,
            ErrorMessage: null));
    }

    private async Task<string?> ResolveRefreshTokenAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_options.RefreshToken))
        {
            return _options.RefreshToken;
        }

        if (!_options.UseStoredUserToken)
        {
            return null;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (_options.SourceUserId.HasValue && _options.SourceUserId.Value > 0)
        {
            return await db.Users
                .AsNoTracking()
                .Where(u => u.Id == _options.SourceUserId.Value)
                .Select(u => u.SpotifyRefreshToken)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return await db.Users
            .AsNoTracking()
            .Where(u => !string.IsNullOrWhiteSpace(u.SpotifyRefreshToken))
            .OrderByDescending(u => u.SpotifyConnectedAtUtc)
            .Select(u => u.SpotifyRefreshToken)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static bool TryValidateConfiguration(SpotifyDevPollingOptions options, out string error)
    {
        if (!options.Enabled)
        {
            error = "Set SpotifyDevPolling:Enabled=true to start polling.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(options.ClientId))
        {
            error = "SpotifyDevPolling:ClientId is missing.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(options.ClientSecret))
        {
            error = "SpotifyDevPolling:ClientSecret is missing.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(options.RefreshToken) && !options.UseStoredUserToken)
        {
            error = "SpotifyDevPolling:RefreshToken is missing. Set UseStoredUserToken=true to read token from DB.";
            return false;
        }

        error = string.Empty;
        return true;
    }
}
