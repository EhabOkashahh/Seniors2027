using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Data;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/portal-content")]
[Authorize]
public class PortalContentController(AppDbContext context) : ControllerBase
{
    private readonly AppDbContext _context = context;

    [HttpGet("announcements")]
    public async Task<ActionResult<IReadOnlyList<AnnouncementDto>>> GetAnnouncements([FromQuery] int maxCount = 10)
    {
        var safeMaxCount = maxCount < 1 ? 5 : Math.Min(maxCount, 100);

        var announcements = await _context.Announcements
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(safeMaxCount)
            .Select(a => new AnnouncementDto
            {
                Id = a.Id,
                Title = a.Title,
                Body = a.Body,
                CreatedAt = a.CreatedAt,
                CreatedByUserId = a.CreatedByUserId,
                CreatedByUsername = a.CreatedByUser.Username
            })
            .ToListAsync();

        return Ok(announcements);
    }

    [HttpGet("events")]
    public async Task<ActionResult<IReadOnlyList<PortalEventDto>>> GetEvents(
        [FromQuery] int maxCount = 10,
        [FromQuery] bool includePast = false)
    {
        var safeMaxCount = maxCount < 1 ? 5 : Math.Min(maxCount, 100);
        var today = DateTime.UtcNow.Date;

        var query = _context.Events
            .AsNoTracking()
            .AsQueryable();

        if (!includePast)
        {
            query = query.Where(e => e.EventDate.Date >= today);
        }

        var events = await query
            .OrderBy(e => e.EventDate)
            .ThenByDescending(e => e.CreatedAt)
            .Take(safeMaxCount)
            .Select(e => new PortalEventDto
            {
                Id = e.Id,
                Title = e.Title,
                EventDate = e.EventDate,
                Location = e.Location,
                Details = e.Details,
                CreatedAt = e.CreatedAt,
                CreatedByUserId = e.CreatedByUserId,
                CreatedByUsername = e.CreatedByUser.Username
            })
            .ToListAsync();

        return Ok(events);
    }
}
