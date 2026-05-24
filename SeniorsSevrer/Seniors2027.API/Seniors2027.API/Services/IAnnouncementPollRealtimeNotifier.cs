namespace Seniors2027.API.Services;

public interface IAnnouncementPollRealtimeNotifier
{
    Task NotifyAnnouncementPollUpdatedAsync(int announcementId, CancellationToken cancellationToken = default);
}
