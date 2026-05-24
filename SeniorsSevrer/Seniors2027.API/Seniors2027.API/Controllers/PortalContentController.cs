using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/portal-content")]
[Authorize]
public class PortalContentController(
    AppDbContext context,
    IAnnouncementPollRealtimeNotifier announcementPollRealtimeNotifier) : ControllerBase
{
    private readonly AppDbContext _context = context;
    private readonly IAnnouncementPollRealtimeNotifier _announcementPollRealtimeNotifier = announcementPollRealtimeNotifier;

    [HttpGet("announcements")]
    public async Task<ActionResult<IReadOnlyList<AnnouncementDto>>> GetAnnouncements([FromQuery] int maxCount = 10)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        var safeMaxCount = maxCount < 1 ? 5 : Math.Min(maxCount, 100);

        var announcements = await _context.Announcements
            .AsNoTracking()
            .Include(a => a.CreatedByUser)
            .OrderByDescending(a => a.CreatedAt)
            .Take(safeMaxCount)
            .ToListAsync();

        var announcementIds = announcements.Select(a => a.Id).ToList();
        var pollVotes = announcementIds.Count == 0
            ? new List<AnnouncementPollVote>()
            : await _context.AnnouncementPollVotes
                .AsNoTracking()
                .Include(v => v.User)
                .Where(v => announcementIds.Contains(v.AnnouncementId))
                .ToListAsync();
        var votesByAnnouncementId = pollVotes
            .GroupBy(v => v.AnnouncementId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<AnnouncementPollVote>)group.ToList());

        var mappedAnnouncements = announcements
            .Select(a =>
            {
                var votes = votesByAnnouncementId.TryGetValue(a.Id, out var value)
                    ? value
                    : Array.Empty<AnnouncementPollVote>();
                return AnnouncementPollMapper.ToAnnouncementDto(a, votes, currentUserId);
            })
            .ToList();

        return Ok(mappedAnnouncements);
    }

    [HttpPost("announcements/{announcementId:int}/poll-vote")]
    public async Task<ActionResult<AnnouncementDto>> VoteOnAnnouncementPoll(int announcementId, [FromBody] VoteAnnouncementPollDto dto)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var announcement = await _context.Announcements
            .FirstOrDefaultAsync(a => a.Id == announcementId);
        if (announcement == null) return NotFound();

        var parsed = AnnouncementPollParser.Parse(announcement.Body);
        if (parsed.Poll == null) return BadRequest("This announcement does not have an active poll.");

        var requestedOption = dto.Option?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(requestedOption)) return BadRequest("Poll option is required.");

        var canonicalOption = parsed.Poll.Options
            .FirstOrDefault(option => string.Equals(option, requestedOption, StringComparison.OrdinalIgnoreCase));
        if (canonicalOption == null) return BadRequest("Invalid poll option.");

        var now = DateTime.UtcNow;
        var existingVote = await _context.AnnouncementPollVotes
            .FirstOrDefaultAsync(v => v.AnnouncementId == announcementId && v.UserId == userId);

        if (existingVote == null)
        {
            _context.AnnouncementPollVotes.Add(new AnnouncementPollVote
            {
                AnnouncementId = announcementId,
                UserId = userId,
                Option = canonicalOption,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else if (string.Equals(existingVote.Option, canonicalOption, StringComparison.OrdinalIgnoreCase))
        {
            _context.AnnouncementPollVotes.Remove(existingVote);
        }
        else
        {
            existingVote.Option = canonicalOption;
            existingVote.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        await _announcementPollRealtimeNotifier.NotifyAnnouncementPollUpdatedAsync(announcementId, HttpContext.RequestAborted);

        var updatedAnnouncement = await _context.Announcements
            .AsNoTracking()
            .Include(a => a.CreatedByUser)
            .FirstAsync(a => a.Id == announcementId);

        var updatedVotes = await _context.AnnouncementPollVotes
            .AsNoTracking()
            .Include(v => v.User)
            .Where(v => v.AnnouncementId == announcementId)
            .ToListAsync();

        var mappedAnnouncement = AnnouncementPollMapper.ToAnnouncementDto(updatedAnnouncement, updatedVotes, userId);
        return Ok(mappedAnnouncement);
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
                PhotoUrl = e.PhotoUrl,
                CreatedAt = e.CreatedAt,
                CreatedByUsername = e.CreatedByUser.Username
            })
            .ToListAsync();

        return Ok(events);
    }
}
