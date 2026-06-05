using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IAppUpdatesRealtimeNotifier _realtimeNotifier;

    public NotificationService(AppDbContext context, IAppUpdatesRealtimeNotifier realtimeNotifier)
    {
        _context = context;
        _realtimeNotifier = realtimeNotifier;
    }

    public async Task<PagedResponseDto<NotificationDto>> GetNotificationsAsync(int userId, int pageNumber, int pageSize)
    {
        var safePageNumber = pageNumber < 1 ? 1 : pageNumber;
        var safePageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 50);

        var query = _context.Notifications
            .AsNoTracking()
            .Include(n => n.Actor)
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);

        var totalCount = await query.CountAsync();
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)safePageSize);

        var notifications = await query
            .Skip((safePageNumber - 1) * safePageSize)
            .Take(safePageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Message = n.Message,
                Link = n.Link,
                ImageUrl = n.ImageUrl,
                ActorId = n.ActorId,
                ActorUsername = n.Actor != null ? n.Actor.Username : null,
                ActorPhotoUrl = n.Actor != null ? n.Actor.PhotoUrl : null,
                IsRead = n.IsRead,
                CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc)
            })
            .ToListAsync();

        return new PagedResponseDto<NotificationDto>
        {
            PageNumber = safePageNumber,
            PageSize = safePageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            HasPreviousPage = safePageNumber > 1,
            HasNextPage = safePageNumber < totalPages,
            Items = notifications
        };
    }

    public async Task<UnreadCountDto> GetUnreadCountAsync(int userId)
    {
        var count = await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);

        return new UnreadCountDto { Count = count };
    }

    public async Task MarkAsReadAsync(int userId, int notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification != null)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true));
    }

    public async Task CreateNotificationAsync(int userId, string type, string message, string? link = null, int? actorId = null, string? imageUrl = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Message = message,
            Link = link,
            ImageUrl = imageUrl,
            ActorId = actorId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        await _realtimeNotifier.NotifyNotificationReceivedAsync(userId);
    }

    public async Task CreateNotificationsBulkAsync(IReadOnlyList<CreateNotificationItem> notifications)
    {
        if (notifications.Count == 0) return;

        var now = DateTime.UtcNow;
        var entities = notifications.Select(n => new Notification
        {
            UserId = n.UserId,
            Type = n.Type,
            Message = n.Message,
            Link = n.Link,
            ImageUrl = n.ImageUrl,
            IsRead = false,
            CreatedAt = now
        }).ToList();

        _context.Notifications.AddRange(entities);
        await _context.SaveChangesAsync();

        foreach (var notification in notifications)
        {
            await _realtimeNotifier.NotifyNotificationReceivedAsync(notification.UserId);
        }
    }

    public async Task DeleteAllAsync(int userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .ToListAsync();

        _context.Notifications.RemoveRange(notifications);
        await _context.SaveChangesAsync();
    }
}
