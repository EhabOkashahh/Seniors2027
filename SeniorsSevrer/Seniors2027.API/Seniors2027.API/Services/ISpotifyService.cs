namespace Seniors2027.API.Services;

public interface ISpotifyService
{
    bool IsConfigured { get; }
    string CreateAuthorizeUrl(string state);
    Task<SpotifyTokenExchangeResult> ExchangeAuthorizationCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<SpotifyTokenExchangeResult> RefreshAccessTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<SpotifyNowPlayingFetchResult> GetCurrentlyPlayingAsync(string accessToken, CancellationToken cancellationToken = default);
}

public sealed record SpotifyTokenExchangeResult(
    bool IsSuccess,
    string? AccessToken,
    string? RefreshToken,
    DateTime? ExpiresAtUtc,
    bool RequiresReconnect,
    string? ErrorMessage);

public sealed record SpotifyNowPlayingFetchResult(
    bool IsSuccess,
    bool Unauthorized,
    bool IsPlaying,
    string? TrackName,
    string? Artists,
    string? AlbumName,
    string? AlbumImageUrl,
    string? SpotifyTrackUrl,
    string? ErrorMessage);
