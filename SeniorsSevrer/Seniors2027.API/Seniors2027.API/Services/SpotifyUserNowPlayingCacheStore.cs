using System.Collections.Concurrent;

namespace Seniors2027.API.Services;

public sealed record SpotifyUserNowPlayingSnapshot(
    int UserId,
    bool IsConnected,
    bool IsPlaying,
    string? TrackName,
    string? Artists,
    string? AlbumName,
    string? AlbumImageUrl,
    string? SpotifyTrackUrl,
    DateTime LastUpdatedUtc,
    string? ErrorMessage);

public interface ISpotifyUserNowPlayingCache
{
    SpotifyUserNowPlayingSnapshot? GetByUserId(int userId);
    void Upsert(SpotifyUserNowPlayingSnapshot snapshot);
}

public sealed class SpotifyUserNowPlayingCache : ISpotifyUserNowPlayingCache
{
    private readonly ConcurrentDictionary<int, SpotifyUserNowPlayingSnapshot> _entries = new();

    public SpotifyUserNowPlayingSnapshot? GetByUserId(int userId)
    {
        if (userId <= 0)
        {
            return null;
        }

        return _entries.TryGetValue(userId, out var snapshot) ? snapshot : null;
    }

    public void Upsert(SpotifyUserNowPlayingSnapshot snapshot)
    {
        _entries[snapshot.UserId] = snapshot;
    }
}
