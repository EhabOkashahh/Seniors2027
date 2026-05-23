namespace Seniors2027.API.Services;

public sealed class SpotifyUserPollingOptions
{
    public bool Enabled { get; set; } = false;
    public int PollIntervalSeconds { get; set; } = 20;
    public int MaxUsersPerCycle { get; set; } = 100;
    public int RequestDelayMilliseconds { get; set; } = 100;
}
