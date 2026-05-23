namespace Seniors2027.API.Services;

public sealed record SpotifyNowPlayingSnapshot(
    bool IsConfigured,
    bool IsConnected,
    bool IsPlaying,
    string? TrackName,
    string? Artists,
    string? AlbumName,
    string? AlbumImageUrl,
    string? SpotifyTrackUrl,
    DateTime LastUpdatedUtc,
    string? ErrorMessage);

public interface ISpotifyNowPlayingSnapshotStore
{
    SpotifyNowPlayingSnapshot GetSnapshot();
    void SetSnapshot(SpotifyNowPlayingSnapshot snapshot);
}

public sealed class SpotifyNowPlayingSnapshotStore : ISpotifyNowPlayingSnapshotStore
{
    private readonly object _gate = new();
    private SpotifyNowPlayingSnapshot _snapshot = new(
        IsConfigured: false,
        IsConnected: false,
        IsPlaying: false,
        TrackName: null,
        Artists: null,
        AlbumName: null,
        AlbumImageUrl: null,
        SpotifyTrackUrl: null,
        LastUpdatedUtc: DateTime.UtcNow,
        ErrorMessage: "Spotify dev poller is not started.");

    public SpotifyNowPlayingSnapshot GetSnapshot()
    {
        lock (_gate)
        {
            return _snapshot;
        }
    }

    public void SetSnapshot(SpotifyNowPlayingSnapshot snapshot)
    {
        lock (_gate)
        {
            _snapshot = snapshot;
        }
    }
}

