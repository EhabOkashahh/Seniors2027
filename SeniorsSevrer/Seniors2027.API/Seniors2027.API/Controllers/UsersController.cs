using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;
using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;
using System.Text.Json;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<DirectoryUserListItemDto>>> GetUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        pageNumber = pageNumber < 1 ? 1 : pageNumber;
        pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 100);

        var query = _context.Users
            .AsNoTracking()
            .Where(u => !string.IsNullOrWhiteSpace(u.Username))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim();
            query = query.Where(u =>
                (u.Username != null && u.Username.Contains(normalized)) ||
                u.Email.Contains(normalized));
        }

        var totalCount = await query.CountAsync();
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)pageSize);
        if (pageNumber > totalPages)
        {
            pageNumber = totalPages;
        }

        var users = await query
            .OrderBy(u => u.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.Points,
                PhotoUrl = u.PhotoUrl != null && u.PhotoUrl.StartsWith("data:") ? null : u.PhotoUrl
            })
            .ToListAsync();

        var items = users
            .Select(u => new DirectoryUserListItemDto
            {
                Id = u.Id,
                Username = BuildDirectoryUsername(u.Username, u.Email, u.Id),
                Points = u.Points,
                PhotoUrl = u.PhotoUrl
            })
            .ToList();

        return Ok(new PagedResponseDto<DirectoryUserListItemDto>
        {
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            HasPreviousPage = pageNumber > 1,
            HasNextPage = pageNumber < totalPages,
            Items = items
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult> GetUserById(int id)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.PhotoUrl,
                u.Description,
                u.SocialLinksJson,
                u.FavoriteSongEmbedUrl,
                u.Points,
                u.Gender
            })
            .FirstOrDefaultAsync();

        if (user == null) return NotFound();

        return Ok(new
        {
            user.Id,
            user.Username,
            user.PhotoUrl,
            user.Description,
            socialLinks = ParseSocialLinks(user.SocialLinksJson),
            favoriteSongEmbedUrl = string.IsNullOrWhiteSpace(user.FavoriteSongEmbedUrl) ? null : user.FavoriteSongEmbedUrl,
            user.Points,
            user.Gender
        });
    }

    private static IReadOnlyList<string> ParseSocialLinks(string? socialLinksJson)
    {
        if (string.IsNullOrWhiteSpace(socialLinksJson)) return Array.Empty<string>();

        try
        {
            var links = JsonSerializer.Deserialize<List<string>>(socialLinksJson) ?? new List<string>();
            var normalized = new List<string>();

            foreach (var link in links)
            {
                if (string.IsNullOrWhiteSpace(link)) continue;

                var candidate = link.Trim();
                if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) continue;
                if (!IsSupportedWebScheme(uri.Scheme)) continue;

                if (normalized.Any(existing => string.Equals(existing, candidate, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                normalized.Add(candidate);
            }

            return normalized;
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static bool IsSupportedWebScheme(string scheme)
    {
        return string.Equals(scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || string.Equals(scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet("{id:int}/badges")]
    public async Task<ActionResult<List<UserBadgeDto>>> GetUserBadges(int id)
    {
        if (!await _context.Users.AnyAsync(u => u.Id == id))
            return NotFound();

        var badges = await _context.UserBadges
            .AsNoTracking()
            .Where(ub => ub.UserId == id)
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

    [HttpGet("monthly-top-three")]
    public async Task<ActionResult> GetMonthlyTopThree([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!User.TryGetUserId(out var _)) return Unauthorized();

        var query = _context.MonthlyTopThree.AsNoTracking();

        if (year.HasValue && month.HasValue)
        {
            var result = await query.FirstOrDefaultAsync(x => x.Year == year.Value && x.Month == month.Value);
            if (result == null) return NotFound();
            return Ok(result);
        }

        var latest = await query
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .FirstOrDefaultAsync();

        if (latest == null) return NotFound();
        return Ok(latest);
    }

    private static string BuildDirectoryUsername(string? username, string? email, int userId)
    {
        if (!string.IsNullOrWhiteSpace(username)) return username.Trim();

        var candidateEmail = email?.Trim();
        if (!string.IsNullOrWhiteSpace(candidateEmail))
        {
            var atIndex = candidateEmail.IndexOf('@');
            if (atIndex > 0)
            {
                var prefix = candidateEmail[..atIndex].Trim();
                if (!string.IsNullOrWhiteSpace(prefix))
                {
                    return prefix;
                }
            }
        }

        return $"Senior {userId}";
    }
}
