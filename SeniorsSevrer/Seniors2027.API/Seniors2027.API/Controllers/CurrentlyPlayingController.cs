using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Services;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/currently-playing")]
public class CurrentlyPlayingController(
    ISpotifyNowPlayingSnapshotStore snapshotStore) : ControllerBase
{
    private readonly ISpotifyNowPlayingSnapshotStore _snapshotStore = snapshotStore;

    [HttpGet]
    public ActionResult<CurrentlyPlayingResponseDto> Get()
    {
        var snapshot = _snapshotStore.GetSnapshot();
        var response = new CurrentlyPlayingResponseDto
        {
            IsConfigured = snapshot.IsConfigured,
            IsConnected = snapshot.IsConnected,
            IsPlaying = snapshot.IsPlaying,
            TrackName = snapshot.TrackName,
            Artists = snapshot.Artists,
            AlbumName = snapshot.AlbumName,
            AlbumImageUrl = snapshot.AlbumImageUrl,
            SpotifyTrackUrl = snapshot.SpotifyTrackUrl,
            LastUpdatedUtc = snapshot.LastUpdatedUtc,
            ErrorMessage = snapshot.ErrorMessage
        };

        return Ok(response);
    }
}

public sealed class CurrentlyPlayingResponseDto
{
    public bool IsConfigured { get; set; }
    public bool IsConnected { get; set; }
    public bool IsPlaying { get; set; }
    public string? TrackName { get; set; }
    public string? Artists { get; set; }
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public string? SpotifyTrackUrl { get; set; }
    public DateTime LastUpdatedUtc { get; set; }
    public string? ErrorMessage { get; set; }
}

