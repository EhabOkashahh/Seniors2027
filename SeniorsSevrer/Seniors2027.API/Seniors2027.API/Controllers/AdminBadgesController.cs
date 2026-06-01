using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/admin/badges")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminBadgesController(
    AppDbContext context,
    ICloudinaryService cloudinaryService) : ControllerBase
{
    private readonly AppDbContext _context = context;
    private readonly ICloudinaryService _cloudinaryService = cloudinaryService;

    [HttpGet]
    public async Task<ActionResult<List<BadgeDto>>> GetAllBadges()
    {
        var badges = await _context.Badges
            .AsNoTracking()
            .OrderByDescending(b => b.CreatedAtUtc)
            .Select(b => new BadgeDto
            {
                Id = b.Id,
                Name = b.Name,
                SvgUrl = b.SvgUrl,
                Description = b.Description
            })
            .ToListAsync();

        return Ok(badges);
    }

    [HttpPost]
    public async Task<ActionResult<BadgeDto>> CreateBadge(
        [FromForm] string name,
        [FromForm] string? description,
        IFormFile? svg)
    {
        var trimmedName = name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
            return BadRequest("Badge name is required.");

        if (svg == null || svg.Length == 0)
            return BadRequest("SVG file is required.");

        if (svg.ContentType != "image/svg+xml" && !svg.FileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only SVG files are allowed.");

        string svgUrl;
        await using (var stream = svg.OpenReadStream())
        {
            var fileName = $"badge_{Guid.NewGuid():N}.svg";
            var result = await _cloudinaryService.UploadRawAsync(stream, fileName, "badges");
            svgUrl = result.SecureUrl;
        }

        var badge = new Badge
        {
            Name = trimmedName,
            SvgUrl = svgUrl,
            Description = description?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Badges.Add(badge);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAllBadges), new
        {
            Id = badge.Id,
            Name = badge.Name,
            SvgUrl = badge.SvgUrl,
            Description = badge.Description
        });
    }

    [HttpPut("{badgeId:int}")]
    public async Task<ActionResult<BadgeDto>> UpdateBadge(
        int badgeId,
        [FromForm] string? name,
        [FromForm] string? description,
        IFormFile? svg)
    {
        var badge = await _context.Badges.FirstOrDefaultAsync(b => b.Id == badgeId);
        if (badge == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(name))
            badge.Name = name.Trim();

        if (description != null)
            badge.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();

        if (svg != null && svg.Length > 0)
        {
            if (svg.ContentType != "image/svg+xml" && !svg.FileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Only SVG files are allowed.");

            if (!string.IsNullOrWhiteSpace(badge.SvgUrl))
                await _cloudinaryService.DeleteResourceByUrlAsync(badge.SvgUrl);

            await using (var stream = svg.OpenReadStream())
            {
                var fileName = $"badge_{Guid.NewGuid():N}.svg";
                var result = await _cloudinaryService.UploadRawAsync(stream, fileName, "badges");
                badge.SvgUrl = result.SecureUrl;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new BadgeDto
        {
            Id = badge.Id,
            Name = badge.Name,
            SvgUrl = badge.SvgUrl,
            Description = badge.Description
        });
    }

    [HttpDelete("{badgeId:int}")]
    public async Task<ActionResult> DeleteBadge(int badgeId)
    {
        var badge = await _context.Badges
            .Include(b => b.UserBadges)
            .FirstOrDefaultAsync(b => b.Id == badgeId);
        if (badge == null) return NotFound();

        if (badge.UserBadges.Count > 0)
            return BadRequest("Cannot delete a badge that has been awarded to users. Revoke it from all users first.");

        if (!string.IsNullOrWhiteSpace(badge.SvgUrl))
            await _cloudinaryService.DeleteResourceByUrlAsync(badge.SvgUrl);

        _context.Badges.Remove(badge);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("users/{userId:int}")]
    public async Task<ActionResult<List<UserBadgeDto>>> GetUserBadges(int userId)
    {
        if (!await _context.Users.AnyAsync(u => u.Id == userId))
            return NotFound("User not found.");

        var badges = await _context.UserBadges
            .AsNoTracking()
            .Where(ub => ub.UserId == userId)
            .Include(ub => ub.Badge)
            .OrderByDescending(ub => ub.AwardedAtUtc)
            .Select(ub => new UserBadgeDto
            {
                Id = ub.Id,
                AwardedAtUtc = ub.AwardedAtUtc,
                Badge = new BadgeDto
                {
                    Id = ub.Badge.Id,
                    Name = ub.Badge.Name,
                    SvgUrl = ub.Badge.SvgUrl,
                    Description = ub.Badge.Description
                }
            })
            .ToListAsync();

        return Ok(badges);
    }

    [HttpPost("award")]
    public async Task<ActionResult<UserBadgeDto>> AwardBadge([FromBody] AwardBadgeDto dto)
    {
        if (dto.UserId <= 0 || dto.BadgeId <= 0)
            return BadRequest("Invalid userId or badgeId.");

        var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return NotFound("User not found.");

        var badgeExists = await _context.Badges.AnyAsync(b => b.Id == dto.BadgeId);
        if (!badgeExists) return NotFound("Badge not found.");

        var alreadyAwarded = await _context.UserBadges
            .AnyAsync(ub => ub.UserId == dto.UserId && ub.BadgeId == dto.BadgeId);
        if (alreadyAwarded)
            return BadRequest("This badge has already been awarded to this user.");

        var userBadge = new UserBadge
        {
            UserId = dto.UserId,
            BadgeId = dto.BadgeId,
            AwardedAtUtc = DateTime.UtcNow
        };

        _context.UserBadges.Add(userBadge);
        await _context.SaveChangesAsync();

        await _context.Entry(userBadge).Reference(ub => ub.Badge).LoadAsync();

        return Ok(new UserBadgeDto
        {
            Id = userBadge.Id,
            AwardedAtUtc = userBadge.AwardedAtUtc,
            Badge = new BadgeDto
            {
                Id = userBadge.Badge.Id,
                Name = userBadge.Badge.Name,
                SvgUrl = userBadge.Badge.SvgUrl,
                Description = userBadge.Badge.Description
            }
        });
    }

    [HttpDelete("{badgeId:int}/users/{userId:int}")]
    public async Task<ActionResult> RevokeBadge(int badgeId, int userId)
    {
        var userBadge = await _context.UserBadges
            .FirstOrDefaultAsync(ub => ub.UserId == userId && ub.BadgeId == badgeId);
        if (userBadge == null) return NotFound("Badge not awarded to this user.");

        _context.UserBadges.Remove(userBadge);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
