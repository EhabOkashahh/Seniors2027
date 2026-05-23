namespace Seniors2027.API.Services;

public sealed class SpotifyDevPollingOptions
{
    public bool Enabled { get; set; } = false;
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
    public string? RefreshToken { get; set; }
    public bool UseStoredUserToken { get; set; } = true;
    public int? SourceUserId { get; set; }
    public int PollIntervalSeconds { get; set; } = 5;
    public string Market { get; set; } = "from_token";
}
