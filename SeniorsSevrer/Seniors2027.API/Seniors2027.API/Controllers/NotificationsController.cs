using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    private readonly INotificationService _notificationService = notificationService;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<NotificationDto>>> GetNotifications(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var result = await _notificationService.GetNotificationsAsync(userId, pageNumber, pageSize);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> GetUnreadCount()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var result = await _notificationService.GetUnreadCountAsync(userId);
        return Ok(result);
    }

    [HttpPatch("{notificationId:int}/read")]
    public async Task<ActionResult> MarkAsRead(int notificationId)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await _notificationService.MarkAsReadAsync(userId, notificationId);
        return NoContent();
    }

    [HttpPatch("read-all")]
    public async Task<ActionResult> MarkAllAsRead()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await _notificationService.MarkAllAsReadAsync(userId);
        return NoContent();
    }

    [HttpDelete]
    public async Task<ActionResult> DeleteAll()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await _notificationService.DeleteAllAsync(userId);
        return NoContent();
    }

    [HttpPost("test")]
    public async Task<ActionResult> CreateTestNotification()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await _notificationService.CreateNotificationAsync(
            userId, "test", "This is a test notification", "/portal");
        return Ok(new { message = "Test notification created" });
    }
}
