using Microsoft.AspNetCore.DataProtection;

namespace Seniors2027.API.Services;

public interface ISpotifyTokenProtector
{
    string Protect(string token);
    string? Unprotect(string? token);
}

public sealed class SpotifyTokenProtector(
    IDataProtectionProvider dataProtectionProvider,
    ILogger<SpotifyTokenProtector> logger) : ISpotifyTokenProtector
{
    private const string Prefix = "dp:v1:";
    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("Seniors2027.SpotifyTokens.v1");
    private readonly ILogger<SpotifyTokenProtector> _logger = logger;

    public string Protect(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return token;
        }

        if (token.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return token;
        }

        return $"{Prefix}{_protector.Protect(token)}";
    }

    public string? Unprotect(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        if (!token.StartsWith(Prefix, StringComparison.Ordinal))
        {
            // Legacy plaintext token from older deployments.
            return token;
        }

        var protectedPayload = token[Prefix.Length..];
        if (string.IsNullOrWhiteSpace(protectedPayload))
        {
            return null;
        }

        try
        {
            return _protector.Unprotect(protectedPayload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to unprotect Spotify token.");
            return null;
        }
    }
}
