using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;
using System.Text.Json;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        pageNumber = pageNumber < 1 ? 1 : pageNumber;
        pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 100);

        var query = _context.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim();
            query = query.Where(u => u.Username.Contains(normalized));
        }

        var users = await query
            .OrderBy(u => u.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Points,
                PhotoUrl = u.PhotoUrl != null && u.PhotoUrl.StartsWith("data:") ? null : u.PhotoUrl
            })
            .ToListAsync();

        return Ok(users);
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
}
