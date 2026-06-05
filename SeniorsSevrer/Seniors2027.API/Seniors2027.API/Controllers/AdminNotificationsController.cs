using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/admin/notifications")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminNotificationsController(
    AppDbContext context,
    INotificationService notificationService) : ControllerBase
{
    private readonly AppDbContext _context = context;
    private readonly INotificationService _notificationService = notificationService;

    [HttpPost("send")]
    public async Task<ActionResult> SendNotification([FromBody] SendNotificationRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest("Message is required.");

        if (string.IsNullOrWhiteSpace(dto.Type))
            return BadRequest("Type is required.");

        List<int> targetUserIds;

        if (dto.UserIds is { Length: > 0 })
        {
            targetUserIds = dto.UserIds.Distinct().ToList();
        }
        else
        {
            targetUserIds = await _context.Users
                .Where(u => !u.IsLocked)
                .Select(u => u.Id)
                .ToListAsync();
        }

        if (targetUserIds.Count == 0)
            return Ok(new { sentCount = 0 });

        var notifications = targetUserIds
            .Select(uid => new CreateNotificationItem(uid, dto.Type, dto.Message, dto.Link))
            .ToList();

        await _notificationService.CreateNotificationsBulkAsync(notifications);

        return Ok(new { sentCount = targetUserIds.Count });
    }
}
