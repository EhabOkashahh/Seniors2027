using Microsoft.AspNetCore.SignalR;
using Seniors2027.API.Hubs;

namespace Seniors2027.API.Services;

public class AppUpdatesRealtimeNotifier : IAppUpdatesRealtimeNotifier
{
    private readonly IHubContext<AppUpdatesHub> _hubContext;
    private readonly ILogger<AppUpdatesRealtimeNotifier> _logger;

    public AppUpdatesRealtimeNotifier(
        IHubContext<AppUpdatesHub> hubContext,
        ILogger<AppUpdatesRealtimeNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyDailyHighlightsUpdatedAsync(CancellationToken cancellationToken = default)
    {
        await TryBroadcastAsync(
            () => _hubContext.Clients.All.SendAsync(AppUpdatesHub.DailyHighlightsUpdatedEvent, cancellationToken),
            "Failed to broadcast daily highlights update.",
            cancellationToken);
    }

    public async Task NotifyAnnouncementPollUpdatedAsync(int announcementId, CancellationToken cancellationToken = default)
    {
        await TryBroadcastAsync(
            () => _hubContext.Clients.All.SendAsync(AppUpdatesHub.AnnouncementPollUpdatedEvent, announcementId, cancellationToken),
            "Failed to broadcast announcement poll update for announcement {AnnouncementId}.",
            cancellationToken,
            announcementId);
    }

    public async Task NotifyPortalContentUpdatedAsync(CancellationToken cancellationToken = default)
    {
        await TryBroadcastAsync(
            () => _hubContext.Clients.All.SendAsync(AppUpdatesHub.PortalContentUpdatedEvent, cancellationToken),
            "Failed to broadcast portal content update.",
            cancellationToken);
    }

    public async Task NotifyMemoryBoardUpdatedAsync(CancellationToken cancellationToken = default)
    {
        await TryBroadcastAsync(
            () => _hubContext.Clients.All.SendAsync(AppUpdatesHub.MemoryBoardUpdatedEvent, cancellationToken),
            "Failed to broadcast memory board update.",
            cancellationToken);
    }

    public async Task NotifyJoinRequestsUpdatedAsync(CancellationToken cancellationToken = default)
    {
        await TryBroadcastAsync(
            () => _hubContext.Clients.All.SendAsync(AppUpdatesHub.JoinRequestsUpdatedEvent, cancellationToken),
            "Failed to broadcast join requests update.",
            cancellationToken);
    }

    private async Task TryBroadcastAsync(
        Func<Task> action,
        string message,
        CancellationToken cancellationToken,
        int? announcementId = null)
    {
        try
        {
            await action();
        }
        catch (Exception ex)
        {
            if (announcementId.HasValue)
            {
                _logger.LogWarning(ex, message, announcementId.Value);
                return;
            }

            _logger.LogWarning(ex, message);
        }
    }
}
