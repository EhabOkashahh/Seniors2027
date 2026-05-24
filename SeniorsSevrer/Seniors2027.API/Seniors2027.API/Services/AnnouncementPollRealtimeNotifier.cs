using Microsoft.AspNetCore.SignalR;
using Seniors2027.API.Hubs;

namespace Seniors2027.API.Services;

public class AnnouncementPollRealtimeNotifier : IAnnouncementPollRealtimeNotifier
{
    private readonly IHubContext<AnnouncementPollsHub> _hubContext;
    private readonly ILogger<AnnouncementPollRealtimeNotifier> _logger;

    public AnnouncementPollRealtimeNotifier(
        IHubContext<AnnouncementPollsHub> hubContext,
        ILogger<AnnouncementPollRealtimeNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyAnnouncementPollUpdatedAsync(int announcementId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync(AnnouncementPollsHub.PollUpdatedEvent, announcementId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast announcement poll update for announcement {AnnouncementId}.", announcementId);
        }
    }
}
