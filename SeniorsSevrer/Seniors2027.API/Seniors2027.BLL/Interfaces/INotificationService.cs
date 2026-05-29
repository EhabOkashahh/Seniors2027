using Seniors2027.BLL.DTOs;

namespace Seniors2027.BLL.Interfaces;

public interface INotificationService
{
    Task<PagedResponseDto<NotificationDto>> GetNotificationsAsync(int userId, int pageNumber, int pageSize);
    Task<UnreadCountDto> GetUnreadCountAsync(int userId);
    Task MarkAsReadAsync(int userId, int notificationId);
    Task MarkAllAsReadAsync(int userId);
    Task CreateNotificationAsync(int userId, string type, string message, string? link = null, int? actorId = null, string? imageUrl = null);
    Task CreateNotificationsBulkAsync(IReadOnlyList<(int userId, string type, string message, string? link)> notifications);
    Task DeleteAllAsync(int userId);
}
