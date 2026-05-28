namespace Seniors2027.BLL.Interfaces;

public interface IAppUpdatesRealtimeNotifier
{
    Task NotifyDailyHighlightsUpdatedAsync(CancellationToken cancellationToken = default);
    Task NotifyAnnouncementPollUpdatedAsync(int announcementId, CancellationToken cancellationToken = default);
    Task NotifyPortalContentUpdatedAsync(CancellationToken cancellationToken = default);
    Task NotifyMemoryBoardUpdatedAsync(CancellationToken cancellationToken = default);
    Task NotifyJoinRequestsUpdatedAsync(CancellationToken cancellationToken = default);
    Task NotifyUserPointsUpdatedAsync(int userId, int newPoints, CancellationToken cancellationToken = default);
    Task NotifyNotificationReceivedAsync(int userId, CancellationToken cancellationToken = default);
}
