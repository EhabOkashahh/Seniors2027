using Microsoft.AspNetCore.SignalR;
using Seniors2027.API.Hubs;

namespace Seniors2027.API.Services;

public class DailyHighlightsRealtimeNotifier : IDailyHighlightsRealtimeNotifier
{
    private readonly IHubContext<DailyHighlightsHub> _hubContext;
    private readonly ILogger<DailyHighlightsRealtimeNotifier> _logger;

    public DailyHighlightsRealtimeNotifier(
        IHubContext<DailyHighlightsHub> hubContext,
        ILogger<DailyHighlightsRealtimeNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyHighlightsUpdatedAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync(DailyHighlightsHub.HighlightsUpdatedEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            // Highlight write succeeded; realtime push failure should not fail API calls.
            _logger.LogWarning(ex, "Failed to broadcast daily highlights update.");
        }
    }
}
