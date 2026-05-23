using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/spotify")]
[Authorize]
public class SpotifyController(
    AppDbContext context,
    ISpotifyService spotifyService,
    IConfiguration configuration,
    ISpotifyTokenProtector tokenProtector,
    ISpotifyUserNowPlayingCache nowPlayingCache) : ControllerBase
{
    private static readonly TimeSpan StateTtl = TimeSpan.FromMinutes(10);
    private readonly AppDbContext _context = context;
    private readonly ISpotifyService _spotifyService = spotifyService;
    private readonly IConfiguration _configuration = configuration;
    private readonly ISpotifyTokenProtector _tokenProtector = tokenProtector;
    private readonly ISpotifyUserNowPlayingCache _nowPlayingCache = nowPlayingCache;

    [HttpGet("connect-url")]
    public ActionResult GetConnectUrl()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (!_spotifyService.IsConfigured)
        {
            return BadRequest("Spotify integration is not configured.");
        }

        var state = CreateSignedState(userId);
        var url = _spotifyService.CreateAuthorizeUrl(state);
        return Ok(new { url });
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        [FromQuery(Name = "error_description")] string? errorDescription)
    {
        if (!TryReadUserIdFromState(state, out var userId))
        {
            return Redirect(BuildFrontendRedirectUrl(null, "failed", "invalid_state"));
        }

        if (!_spotifyService.IsConfigured)
        {
            return Redirect(BuildFrontendRedirectUrl(userId, "failed", "spotify_not_configured"));
        }

        if (!string.IsNullOrWhiteSpace(error))
        {
            var reason = string.IsNullOrWhiteSpace(errorDescription) ? error : errorDescription;
            return Redirect(BuildFrontendRedirectUrl(userId, "failed", reason));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return Redirect(BuildFrontendRedirectUrl(userId, "failed", "missing_authorization_code"));
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return Redirect(BuildFrontendRedirectUrl(userId, "failed", "user_not_found"));
        }

        var tokenResult = await _spotifyService.ExchangeAuthorizationCodeAsync(code, HttpContext.RequestAborted);
        if (!tokenResult.IsSuccess ||
            string.IsNullOrWhiteSpace(tokenResult.AccessToken) ||
            string.IsNullOrWhiteSpace(tokenResult.RefreshToken) ||
            !tokenResult.ExpiresAtUtc.HasValue)
        {
            var reason = tokenResult.ErrorMessage ?? "spotify_exchange_failed";
            return Redirect(BuildFrontendRedirectUrl(userId, "failed", reason));
        }

        user.SpotifyAccessToken = _tokenProtector.Protect(tokenResult.AccessToken);
        user.SpotifyRefreshToken = _tokenProtector.Protect(tokenResult.RefreshToken);
        user.SpotifyTokenExpiresAtUtc = tokenResult.ExpiresAtUtc.Value;
        user.SpotifyConnectedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Redirect(BuildFrontendRedirectUrl(userId, "connected", null));
    }

    [HttpPost("disconnect")]
    public async Task<ActionResult> Disconnect()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        ClearSpotifyTokens(user);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Spotify disconnected." });
    }

    [HttpGet("me/now-playing")]
    public async Task<ActionResult<SpotifyNowPlayingDto>> GetMyNowPlaying()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var status = await ResolveNowPlayingAsync(user, HttpContext.RequestAborted);
        _nowPlayingCache.Upsert(ToSnapshot(userId, status));
        return Ok(status);
    }

    [HttpGet("users/{userId:int}/now-playing")]
    public async Task<ActionResult<SpotifyNowPlayingDto?>> GetUserNowPlaying(int userId)
    {
        var cached = _nowPlayingCache.GetByUserId(userId);
        if (cached is not null)
        {
            return Ok(ToDto(cached));
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var status = await ResolveNowPlayingAsync(user, HttpContext.RequestAborted);
        _nowPlayingCache.Upsert(ToSnapshot(userId, status));
        return Ok(status);
    }

    [HttpGet("currently-playing")]
    public async Task<ActionResult<SpotifyNowPlayingDto>> GetCurrentlyPlayingByUser([FromQuery] int userId)
    {
        if (userId <= 0)
        {
            return BadRequest("Query parameter 'userId' is required.");
        }

        var cached = _nowPlayingCache.GetByUserId(userId);
        if (cached is not null)
        {
            return Ok(ToDto(cached));
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var status = await ResolveNowPlayingAsync(user, HttpContext.RequestAborted);
        _nowPlayingCache.Upsert(ToSnapshot(userId, status));
        return Ok(status);
    }

    private async Task<SpotifyNowPlayingDto> ResolveNowPlayingAsync(User user, CancellationToken cancellationToken)
    {
        if (!_spotifyService.IsConfigured)
        {
            return SpotifyNowPlayingDto.Disconnected();
        }

        var refreshToken = _tokenProtector.Unprotect(user.SpotifyRefreshToken);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return SpotifyNowPlayingDto.Disconnected();
        }

        var isConnected = true;
        var hasUpdatedUser = false;
        var accessToken = _tokenProtector.Unprotect(user.SpotifyAccessToken);
        if (string.IsNullOrWhiteSpace(accessToken) ||
            !user.SpotifyTokenExpiresAtUtc.HasValue ||
            user.SpotifyTokenExpiresAtUtc.Value <= DateTime.UtcNow)
        {
            var refreshResult = await _spotifyService.RefreshAccessTokenAsync(refreshToken, cancellationToken);
            if (!refreshResult.IsSuccess || string.IsNullOrWhiteSpace(refreshResult.AccessToken) || !refreshResult.ExpiresAtUtc.HasValue)
            {
                if (refreshResult.RequiresReconnect)
                {
                    isConnected = false;
                    ClearSpotifyTokens(user);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                return new SpotifyNowPlayingDto
                {
                    IsConnected = isConnected,
                    IsPlaying = false,
                    ErrorMessage = refreshResult.ErrorMessage
                };
            }

            user.SpotifyAccessToken = _tokenProtector.Protect(refreshResult.AccessToken);
            user.SpotifyTokenExpiresAtUtc = refreshResult.ExpiresAtUtc.Value;
            user.SpotifyRefreshToken = _tokenProtector.Protect(refreshResult.RefreshToken ?? refreshToken);
            user.SpotifyConnectedAtUtc ??= DateTime.UtcNow;
            hasUpdatedUser = true;
            accessToken = refreshResult.AccessToken;
            refreshToken = refreshResult.RefreshToken ?? refreshToken;
        }

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return SpotifyNowPlayingDto.Disconnected();
        }

        var nowPlayingResult = await _spotifyService.GetCurrentlyPlayingAsync(accessToken, cancellationToken);
        if (nowPlayingResult.Unauthorized)
        {
            var refreshResult = await _spotifyService.RefreshAccessTokenAsync(refreshToken, cancellationToken);
            if (!refreshResult.IsSuccess || string.IsNullOrWhiteSpace(refreshResult.AccessToken) || !refreshResult.ExpiresAtUtc.HasValue)
            {
                if (refreshResult.RequiresReconnect)
                {
                    isConnected = false;
                    ClearSpotifyTokens(user);
                }

                if (hasUpdatedUser || refreshResult.RequiresReconnect)
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }

                return new SpotifyNowPlayingDto
                {
                    IsConnected = isConnected,
                    IsPlaying = false,
                    ErrorMessage = refreshResult.ErrorMessage
                };
            }

            user.SpotifyAccessToken = _tokenProtector.Protect(refreshResult.AccessToken);
            user.SpotifyTokenExpiresAtUtc = refreshResult.ExpiresAtUtc.Value;
            user.SpotifyRefreshToken = _tokenProtector.Protect(refreshResult.RefreshToken ?? refreshToken);
            user.SpotifyConnectedAtUtc ??= DateTime.UtcNow;
            hasUpdatedUser = true;
            nowPlayingResult = await _spotifyService.GetCurrentlyPlayingAsync(refreshResult.AccessToken, cancellationToken);
        }

        if (hasUpdatedUser)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!nowPlayingResult.IsSuccess)
        {
            return new SpotifyNowPlayingDto
            {
                IsConnected = isConnected,
                IsPlaying = false,
                ErrorMessage = nowPlayingResult.ErrorMessage
            };
        }

        return new SpotifyNowPlayingDto
        {
            IsConnected = isConnected,
            IsPlaying = nowPlayingResult.IsPlaying,
            TrackName = nowPlayingResult.TrackName,
            Artists = nowPlayingResult.Artists,
            AlbumName = nowPlayingResult.AlbumName,
            AlbumImageUrl = nowPlayingResult.AlbumImageUrl,
            SpotifyTrackUrl = nowPlayingResult.SpotifyTrackUrl,
            ErrorMessage = nowPlayingResult.ErrorMessage
        };
    }

    private static SpotifyNowPlayingDto ToDto(SpotifyUserNowPlayingSnapshot snapshot)
    {
        return new SpotifyNowPlayingDto
        {
            IsConnected = snapshot.IsConnected,
            IsPlaying = snapshot.IsPlaying,
            TrackName = snapshot.TrackName,
            Artists = snapshot.Artists,
            AlbumName = snapshot.AlbumName,
            AlbumImageUrl = snapshot.AlbumImageUrl,
            SpotifyTrackUrl = snapshot.SpotifyTrackUrl,
            ErrorMessage = snapshot.ErrorMessage,
            LastUpdatedUtc = snapshot.LastUpdatedUtc
        };
    }

    private static SpotifyUserNowPlayingSnapshot ToSnapshot(int userId, SpotifyNowPlayingDto dto)
    {
        return new SpotifyUserNowPlayingSnapshot(
            UserId: userId,
            IsConnected: dto.IsConnected,
            IsPlaying: dto.IsPlaying,
            TrackName: dto.TrackName,
            Artists: dto.Artists,
            AlbumName: dto.AlbumName,
            AlbumImageUrl: dto.AlbumImageUrl,
            SpotifyTrackUrl: dto.SpotifyTrackUrl,
            LastUpdatedUtc: dto.LastUpdatedUtc ?? DateTime.UtcNow,
            ErrorMessage: dto.ErrorMessage);
    }

    private static void ClearSpotifyTokens(User user)
    {
        user.SpotifyAccessToken = null;
        user.SpotifyRefreshToken = null;
        user.SpotifyTokenExpiresAtUtc = null;
        user.SpotifyConnectedAtUtc = null;
    }

    private string CreateSignedState(int userId)
    {
        var issuedAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var nonce = Guid.NewGuid().ToString("N");
        var payload = $"{userId}.{issuedAtUnix}.{nonce}";
        var signature = ComputeStateSignature(payload);
        return $"{payload}.{signature}";
    }

    private bool TryReadUserIdFromState(string? state, out int userId)
    {
        userId = 0;
        if (string.IsNullOrWhiteSpace(state)) return false;

        var parts = state.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 4) return false;

        if (!int.TryParse(parts[0], out userId) || userId <= 0) return false;
        if (!long.TryParse(parts[1], out var issuedAtUnix)) return false;
        if (string.IsNullOrWhiteSpace(parts[2])) return false;

        var issuedAt = DateTimeOffset.FromUnixTimeSeconds(issuedAtUnix);
        if (issuedAt.Add(StateTtl) < DateTimeOffset.UtcNow) return false;

        var payload = $"{parts[0]}.{parts[1]}.{parts[2]}";
        var expectedSignature = ComputeStateSignature(payload);
        return ConstantTimeEquals(parts[3], expectedSignature);
    }

    private string ComputeStateSignature(string payload)
    {
        var stateSecret = _configuration["Spotify:StateSecret"];
        if (string.IsNullOrWhiteSpace(stateSecret))
        {
            stateSecret = _configuration["Jwt:Key"];
        }

        if (string.IsNullOrWhiteSpace(stateSecret))
        {
            throw new InvalidOperationException("Spotify state secret is not configured.");
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(stateSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return ToBase64Url(hash);
    }

    private string BuildFrontendRedirectUrl(int? userId, string status, string? reason)
    {
        var frontendBaseUrl = _configuration["Spotify:FrontendBaseUrl"];
        if (string.IsNullOrWhiteSpace(frontendBaseUrl))
        {
            frontendBaseUrl = "http://localhost:5173";
        }

        var normalizedBase = frontendBaseUrl.TrimEnd('/');
        var path = userId.HasValue ? $"/profile/{userId.Value}" : "/directory";

        var query = $"spotify={Uri.EscapeDataString(status)}";
        if (!string.IsNullOrWhiteSpace(reason))
        {
            query += $"&reason={Uri.EscapeDataString(reason)}";
        }

        return $"{normalizedBase}{path}?{query}";
    }

    private static bool ConstantTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }

    private static string ToBase64Url(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}

public sealed class SpotifyNowPlayingDto
{
    public bool IsConnected { get; set; }
    public bool IsPlaying { get; set; }
    public string? TrackName { get; set; }
    public string? Artists { get; set; }
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public string? SpotifyTrackUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? LastUpdatedUtc { get; set; }

    public static SpotifyNowPlayingDto Disconnected() => new()
    {
        IsConnected = false,
        IsPlaying = false
    };
}
