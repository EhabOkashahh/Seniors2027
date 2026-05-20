using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminController(
    IJoinRequestService joinRequestService,
    AppDbContext context,
    IWebHostEnvironment environment) : ControllerBase
{
    private readonly IJoinRequestService _joinRequestService = joinRequestService;
    private readonly AppDbContext _context = context;
    private readonly IWebHostEnvironment _environment = environment;

    [HttpGet("join-requests")]
    public async Task<ActionResult<IReadOnlyList<JoinRequestDto>>> GetJoinRequests([FromQuery] JoinRequestStatus? status = JoinRequestStatus.Pending)
    {
        var requests = await _joinRequestService.GetJoinRequestsAsync(status);
        return Ok(requests);
    }

    [HttpPost("join-requests/{requestId:int}/decision")]
    public async Task<ActionResult<JoinRequestDto>> ReviewJoinRequest(int requestId, ReviewJoinRequestDto dto)
    {
        if (!User.TryGetUserId(out var reviewerUserId)) return Unauthorized();

        try
        {
            var updated = await _joinRequestService.ReviewJoinRequestAsync(requestId, dto.Decision, reviewerUserId);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserListItemDto>>> GetUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        pageNumber = pageNumber < 1 ? 1 : pageNumber;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 100);

        var query = _context.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim();
            query = query.Where(u =>
                u.Username.Contains(normalized) ||
                u.Email.Contains(normalized));
        }

        var users = await query
            .OrderBy(u => u.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserListItemDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                PhotoUrl = u.PhotoUrl != null && u.PhotoUrl.StartsWith("data:") ? null : u.PhotoUrl,
                Gender = u.Gender,
                Role = u.Role,
                IsLocked = u.IsLocked,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("users/{userId:int}/lock")]
    public async Task<ActionResult<AdminUserListItemDto>> SetUserLock(int userId, AdminSetUserLockDto dto)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        if (requesterUserId == userId) return BadRequest("You cannot lock your own account.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        user.IsLocked = dto.IsLocked;
        user.LockedAtUtc = dto.IsLocked ? DateTime.UtcNow : null;
        await _context.SaveChangesAsync();

        return Ok(MapAdminUserDto(user));
    }

    [HttpDelete("users/{userId:int}")]
    public async Task<ActionResult> DeleteUser(int userId)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        if (requesterUserId == userId) return BadRequest("You cannot delete your own account.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);
        var localPhotoPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        TryAddLocalPhotoPath(user.PhotoUrl, photosDirectory, localPhotoPaths);

        var userGalleryPhotos = await _context.GalleryPhotos
            .Where(p => p.UserId == userId)
            .ToListAsync();
        foreach (var photo in userGalleryPhotos)
        {
            TryAddLocalPhotoPath(photo.PhotoUrl, photosDirectory, localPhotoPaths);
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var userHighlights = await _context.DailyHighlights
                .Where(h => h.UserId == userId)
                .ToListAsync();
            if (userHighlights.Count > 0)
            {
                _context.DailyHighlights.RemoveRange(userHighlights);
            }

            if (userGalleryPhotos.Count > 0)
            {
                _context.GalleryPhotos.RemoveRange(userGalleryPhotos);
            }

            var userNotes = await _context.Notes
                .Where(n => n.SenderId == userId || n.RecipientId == userId)
                .ToListAsync();
            if (userNotes.Count > 0)
            {
                _context.Notes.RemoveRange(userNotes);
            }

            var joinRequests = await _context.JoinRequests
                .Where(j => j.ApprovedUserId == userId || j.ReviewedByUserId == userId)
                .ToListAsync();
            foreach (var joinRequest in joinRequests)
            {
                if (joinRequest.ApprovedUserId == userId) joinRequest.ApprovedUserId = null;
                if (joinRequest.ReviewedByUserId == userId) joinRequest.ReviewedByUserId = null;
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        foreach (var localPhotoPath in localPhotoPaths)
        {
            TryDeleteFile(localPhotoPath);
        }

        return NoContent();
    }

    private static AdminUserListItemDto MapAdminUserDto(User user)
    {
        return new AdminUserListItemDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            PhotoUrl = string.IsNullOrWhiteSpace(user.PhotoUrl) || user.PhotoUrl.StartsWith("data:") ? null : user.PhotoUrl,
            Gender = user.Gender,
            Role = user.Role,
            IsLocked = user.IsLocked,
            CreatedAt = user.CreatedAt
        };
    }

    private static void TryAddLocalPhotoPath(string? photoUrl, string photosDirectory, ISet<string> paths)
    {
        if (TryGetLocalSeniorsPhotoPath(photoUrl, photosDirectory, out var photoPath))
        {
            paths.Add(photoPath);
        }
    }

    private static bool TryGetLocalSeniorsPhotoPath(string? photoUrl, string photosDirectory, out string filePath)
    {
        filePath = string.Empty;
        if (string.IsNullOrWhiteSpace(photoUrl)) return false;
        if (!photoUrl.Contains("/SeniorsPhotos/", StringComparison.OrdinalIgnoreCase)) return false;
        if (!Uri.TryCreate(photoUrl, UriKind.Absolute, out var uri)) return false;

        var fileName = Path.GetFileName(uri.LocalPath);
        if (string.IsNullOrWhiteSpace(fileName)) return false;

        var candidate = Path.GetFullPath(Path.Combine(photosDirectory, fileName));
        var root = Path.GetFullPath(photosDirectory);
        if (!candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase)) return false;

        filePath = candidate;
        return true;
    }

    private static void TryDeleteFile(string filePath)
    {
        try
        {
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }
        catch
        {
            // No-op: deleting DB records is the primary action.
        }
    }
}
