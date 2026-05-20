namespace Seniors2027.API.Services;

public interface IDailyHighlightsRealtimeNotifier
{
    Task NotifyHighlightsUpdatedAsync(CancellationToken cancellationToken = default);
}
