using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Seniors2027.API.Services;

public sealed class SpotifyService : ISpotifyService
{
    private const string AccountsBaseUrl = "https://accounts.spotify.com";
    private const string ApiBaseUrl = "https://api.spotify.com";
    private static readonly TimeSpan ExpirySafetyBuffer = TimeSpan.FromSeconds(30);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyService> _logger;
    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly string? _redirectUri;

    public SpotifyService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SpotifyService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _clientId = configuration["Spotify:ClientId"];
        _clientSecret = configuration["Spotify:ClientSecret"];
        _redirectUri = configuration["Spotify:RedirectUri"];
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_clientId) &&
        !string.IsNullOrWhiteSpace(_clientSecret) &&
        !string.IsNullOrWhiteSpace(_redirectUri);

    public string CreateAuthorizeUrl(string state)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(_clientId) || string.IsNullOrWhiteSpace(_redirectUri))
        {
            throw new InvalidOperationException("Spotify OAuth is not configured.");
        }

        const string scopes = "user-read-currently-playing user-read-playback-state";
        var query = new StringBuilder();
        query.Append("response_type=code");
        query.Append("&client_id=").Append(Uri.EscapeDataString(_clientId));
        query.Append("&scope=").Append(Uri.EscapeDataString(scopes));
        query.Append("&redirect_uri=").Append(Uri.EscapeDataString(_redirectUri));
        query.Append("&state=").Append(Uri.EscapeDataString(state));
        query.Append("&show_dialog=true");

        return $"{AccountsBaseUrl}/authorize?{query}";
    }

    public async Task<SpotifyTokenExchangeResult> ExchangeAuthorizationCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(_redirectUri))
        {
            return new SpotifyTokenExchangeResult(false, null, null, null, true, "Spotify OAuth is not configured.");
        }

        var fields = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _redirectUri
        };

        return await ExchangeTokenAsync(fields, cancellationToken);
    }

    public async Task<SpotifyTokenExchangeResult> RefreshAccessTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            return new SpotifyTokenExchangeResult(false, null, null, null, true, "Spotify OAuth is not configured.");
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return new SpotifyTokenExchangeResult(false, null, null, null, true, "Missing Spotify refresh token.");
        }

        var fields = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken
        };

        var result = await ExchangeTokenAsync(fields, cancellationToken);
        if (result.IsSuccess && string.IsNullOrWhiteSpace(result.RefreshToken))
        {
            return result with { RefreshToken = refreshToken };
        }

        return result;
    }

    public async Task<SpotifyNowPlayingFetchResult> GetCurrentlyPlayingAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return new SpotifyNowPlayingFetchResult(
                IsSuccess: false,
                Unauthorized: true,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                ErrorMessage: "Missing Spotify access token.",
                StatusCode: null,
                RetryAfterSeconds: null);
        }

        var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiBaseUrl}/v1/me/player/currently-playing");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var client = _httpClientFactory.CreateClient();
        HttpResponseMessage response;

        try
        {
            response = await client.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Spotify currently-playing request failed.");
            return new SpotifyNowPlayingFetchResult(
                IsSuccess: false,
                Unauthorized: false,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                ErrorMessage: "Spotify request failed.",
                StatusCode: null,
                RetryAfterSeconds: null);
        }

        if (response.StatusCode == HttpStatusCode.NoContent)
        {
            return new SpotifyNowPlayingFetchResult(
                IsSuccess: true,
                Unauthorized: false,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                ErrorMessage: null,
                StatusCode: response.StatusCode,
                RetryAfterSeconds: null);
        }

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            return new SpotifyNowPlayingFetchResult(
                IsSuccess: false,
                Unauthorized: true,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                ErrorMessage: "Spotify unauthorized.",
                StatusCode: response.StatusCode,
                RetryAfterSeconds: null);
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return new SpotifyNowPlayingFetchResult(
                IsSuccess: false,
                Unauthorized: false,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                ErrorMessage: ExtractSpotifyErrorMessage(body, response.StatusCode),
                StatusCode: response.StatusCode,
                RetryAfterSeconds: TryReadRetryAfterSeconds(response));
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            var isPlaying = root.TryGetProperty("is_playing", out var isPlayingNode) && isPlayingNode.ValueKind == JsonValueKind.True;
            if (!root.TryGetProperty("item", out var itemNode) || itemNode.ValueKind != JsonValueKind.Object)
            {
                return new SpotifyNowPlayingFetchResult(
                    IsSuccess: true,
                    Unauthorized: false,
                    IsPlaying: false,
                    TrackName: null,
                    Artists: null,
                    AlbumName: null,
                    AlbumImageUrl: null,
                    SpotifyTrackUrl: null,
                    ErrorMessage: null,
                    StatusCode: response.StatusCode,
                    RetryAfterSeconds: null);
            }

            var trackName = TryReadString(itemNode, "name");
            var albumName = itemNode.TryGetProperty("album", out var albumNode) && albumNode.ValueKind == JsonValueKind.Object
                ? TryReadString(albumNode, "name")
                : null;
            var albumImageUrl = TryReadAlbumImageUrl(itemNode);
            var artists = TryReadArtists(itemNode);
            var trackUrl = TryReadSpotifyTrackUrl(itemNode);

            return new SpotifyNowPlayingFetchResult(
                true,
                false,
                isPlaying && !string.IsNullOrWhiteSpace(trackName),
                trackName,
                artists,
                albumName,
                albumImageUrl,
                trackUrl,
                null,
                response.StatusCode,
                null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Spotify currently-playing response.");
            return new SpotifyNowPlayingFetchResult(
                IsSuccess: false,
                Unauthorized: false,
                IsPlaying: false,
                TrackName: null,
                Artists: null,
                AlbumName: null,
                AlbumImageUrl: null,
                SpotifyTrackUrl: null,
                ErrorMessage: "Invalid Spotify response.",
                StatusCode: response.StatusCode,
                RetryAfterSeconds: null);
        }
    }

    private async Task<SpotifyTokenExchangeResult> ExchangeTokenAsync(
        IReadOnlyDictionary<string, string> formFields,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(_clientId) || string.IsNullOrWhiteSpace(_clientSecret))
        {
            return new SpotifyTokenExchangeResult(false, null, null, null, true, "Spotify OAuth is not configured.");
        }

        var request = new HttpRequestMessage(HttpMethod.Post, $"{AccountsBaseUrl}/api/token");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", BuildBasicAuthValue(_clientId, _clientSecret));
        request.Content = new FormUrlEncodedContent(formFields);

        var client = _httpClientFactory.CreateClient();
        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Spotify token exchange request failed.");
            return new SpotifyTokenExchangeResult(false, null, null, null, false, "Spotify token request failed.");
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorCode = TryReadStringFromSpotifyError(body, "error");
            var requiresReconnect = string.Equals(errorCode, "invalid_grant", StringComparison.OrdinalIgnoreCase)
                || string.Equals(errorCode, "invalid_client", StringComparison.OrdinalIgnoreCase);
            return new SpotifyTokenExchangeResult(
                false,
                null,
                null,
                null,
                requiresReconnect,
                ExtractSpotifyErrorMessage(body, response.StatusCode));
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            var accessToken = TryReadString(root, "access_token");
            var refreshToken = TryReadString(root, "refresh_token");
            var expiresInSeconds = root.TryGetProperty("expires_in", out var expiresInNode) && expiresInNode.TryGetInt32(out var expiresIn)
                ? expiresIn
                : 3600;

            if (string.IsNullOrWhiteSpace(accessToken))
            {
                return new SpotifyTokenExchangeResult(false, null, null, null, false, "Spotify token missing access token.");
            }

            var safeExpirySeconds = Math.Max(60, expiresInSeconds);
            var expiresAtUtc = DateTime.UtcNow
                .AddSeconds(safeExpirySeconds)
                .Subtract(ExpirySafetyBuffer);

            return new SpotifyTokenExchangeResult(true, accessToken, refreshToken, expiresAtUtc, false, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Spotify token response.");
            return new SpotifyTokenExchangeResult(false, null, null, null, false, "Invalid Spotify token response.");
        }
    }

    private static string BuildBasicAuthValue(string clientId, string clientSecret)
    {
        var raw = $"{clientId}:{clientSecret}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    }

    private static string? TryReadString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var node)) return null;
        return node.ValueKind == JsonValueKind.String ? node.GetString() : null;
    }

    private static string? TryReadArtists(JsonElement itemNode)
    {
        if (!itemNode.TryGetProperty("artists", out var artistsNode) || artistsNode.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var values = new List<string>();
        foreach (var artistNode in artistsNode.EnumerateArray())
        {
            var name = TryReadString(artistNode, "name");
            if (!string.IsNullOrWhiteSpace(name))
            {
                values.Add(name);
            }
        }

        return values.Count == 0 ? null : string.Join(", ", values);
    }

    private static string? TryReadAlbumImageUrl(JsonElement itemNode)
    {
        if (!itemNode.TryGetProperty("album", out var albumNode) || albumNode.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!albumNode.TryGetProperty("images", out var imagesNode) || imagesNode.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var imageNode in imagesNode.EnumerateArray())
        {
            var url = TryReadString(imageNode, "url");
            if (!string.IsNullOrWhiteSpace(url))
            {
                return url;
            }
        }

        return null;
    }

    private static string? TryReadSpotifyTrackUrl(JsonElement itemNode)
    {
        if (!itemNode.TryGetProperty("external_urls", out var externalUrlsNode) || externalUrlsNode.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return TryReadString(externalUrlsNode, "spotify");
    }

    private static string? TryReadStringFromSpotifyError(string body, string propertyName)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty(propertyName, out var topNode) && topNode.ValueKind == JsonValueKind.String)
            {
                return topNode.GetString();
            }

            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("error", out var errorNode) &&
                errorNode.ValueKind == JsonValueKind.Object &&
                errorNode.TryGetProperty(propertyName, out var nestedNode) &&
                nestedNode.ValueKind == JsonValueKind.String)
            {
                return nestedNode.GetString();
            }
        }
        catch
        {
            // Ignore parse errors for fallback.
        }

        return null;
    }

    private static string ExtractSpotifyErrorMessage(string body, HttpStatusCode statusCode)
    {
        var description = TryReadStringFromSpotifyError(body, "error_description")
            ?? TryReadStringFromSpotifyError(body, "message")
            ?? TryReadStringFromSpotifyError(body, "error");

        if (!string.IsNullOrWhiteSpace(description))
        {
            return description;
        }

        return $"Spotify request failed ({(int)statusCode}).";
    }

    private static int? TryReadRetryAfterSeconds(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter?.Delta.HasValue == true)
        {
            return Math.Max(0, (int)Math.Ceiling(response.Headers.RetryAfter.Delta.Value.TotalSeconds));
        }

        if (response.Headers.RetryAfter?.Date.HasValue == true)
        {
            var delta = response.Headers.RetryAfter.Date.Value - DateTimeOffset.UtcNow;
            return Math.Max(0, (int)Math.Ceiling(delta.TotalSeconds));
        }

        return null;
    }
}
