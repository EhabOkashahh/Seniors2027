using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
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
    IWebHostEnvironment environment,
    IImageUploadProcessor imageUploadProcessor) : ControllerBase
{
    private readonly IJoinRequestService _joinRequestService = joinRequestService;
    private readonly AppDbContext _context = context;
    private readonly IWebHostEnvironment _environment = environment;
    private readonly IImageUploadProcessor _imageUploadProcessor = imageUploadProcessor;

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
    public async Task<ActionResult<PagedResponseDto<AdminUserListItemDto>>> GetUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        pageNumber = pageNumber < 1 ? 1 : pageNumber;
        pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 100);

        var query = _context.Users
            .AsNoTracking()
            .AsQueryable();

        if (User.TryGetUserId(out var requesterUserId))
        {
            query = query.Where(u => u.Id != requesterUserId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim();
            query = query.Where(u =>
                u.Username.Contains(normalized) ||
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

        return Ok(new PagedResponseDto<AdminUserListItemDto>
        {
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            HasPreviousPage = pageNumber > 1,
            HasNextPage = pageNumber < totalPages,
            Items = users
        });
    }

    [HttpGet("users/{userId:int}")]
    public async Task<ActionResult<AdminUserListItemDto>> GetUserById(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        return Ok(MapAdminUserDto(user));
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

        var userMemoryBoardPhotos = await _context.MemoryBoardPhotos
            .Where(p => p.UserId == userId)
            .ToListAsync();
        foreach (var photo in userMemoryBoardPhotos)
        {
            TryAddLocalPhotoPath(photo.PhotoUrl, photosDirectory, localPhotoPaths);
        }

        var reviewedMemoryBoardPhotos = await _context.MemoryBoardPhotos
            .Where(p => p.ReviewedByUserId == userId && p.UserId != userId)
            .ToListAsync();

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

            var userHighlightReactions = await _context.DailyHighlightReactions
                .Where(r => r.UserId == userId)
                .ToListAsync();
            if (userHighlightReactions.Count > 0)
            {
                _context.DailyHighlightReactions.RemoveRange(userHighlightReactions);
            }

            var userAnnouncementPollVotes = await _context.AnnouncementPollVotes
                .Where(v => v.UserId == userId)
                .ToListAsync();
            if (userAnnouncementPollVotes.Count > 0)
            {
                _context.AnnouncementPollVotes.RemoveRange(userAnnouncementPollVotes);
            }

            if (userGalleryPhotos.Count > 0)
            {
                _context.GalleryPhotos.RemoveRange(userGalleryPhotos);
            }

            if (userMemoryBoardPhotos.Count > 0)
            {
                _context.MemoryBoardPhotos.RemoveRange(userMemoryBoardPhotos);
            }

            var userNotes = await _context.Notes
                .Where(n => n.SenderId == userId || n.RecipientId == userId)
                .ToListAsync();
            if (userNotes.Count > 0)
            {
                _context.Notes.RemoveRange(userNotes);
            }

            var userAnnouncements = await _context.Announcements
                .Where(a => a.CreatedByUserId == userId)
                .ToListAsync();
            foreach (var announcement in userAnnouncements)
            {
                TryAddLocalPhotoPath(announcement.PhotoUrl, photosDirectory, localPhotoPaths);
            }
            if (userAnnouncements.Count > 0)
            {
                _context.Announcements.RemoveRange(userAnnouncements);
            }

            var userEvents = await _context.Events
                .Where(e => e.CreatedByUserId == userId)
                .ToListAsync();
            foreach (var portalEvent in userEvents)
            {
                TryAddLocalPhotoPath(portalEvent.PhotoUrl, photosDirectory, localPhotoPaths);
            }
            if (userEvents.Count > 0)
            {
                _context.Events.RemoveRange(userEvents);
            }

            var joinRequests = await _context.JoinRequests
                .Where(j => j.ApprovedUserId == userId || j.ReviewedByUserId == userId)
                .ToListAsync();
            foreach (var joinRequest in joinRequests)
            {
                if (joinRequest.ApprovedUserId == userId) joinRequest.ApprovedUserId = null;
                if (joinRequest.ReviewedByUserId == userId) joinRequest.ReviewedByUserId = null;
            }

            foreach (var reviewedPhoto in reviewedMemoryBoardPhotos)
            {
                reviewedPhoto.ReviewedByUserId = null;
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

    [HttpGet("announcements")]
    public async Task<ActionResult<IReadOnlyList<AnnouncementDto>>> GetAnnouncements([FromQuery] int maxCount = 50)
    {
        var safeMaxCount = maxCount < 1 ? 10 : Math.Min(maxCount, 200);

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

        var items = announcements
            .Select(a =>
            {
                var votes = votesByAnnouncementId.TryGetValue(a.Id, out var value)
                    ? value
                    : Array.Empty<AnnouncementPollVote>();
                return AnnouncementPollMapper.ToAnnouncementDto(a, votes);
            })
            .ToList();

        return Ok(items);
    }

    [HttpPost("announcements")]
    public async Task<ActionResult<AnnouncementDto>> CreateAnnouncement([FromForm] CreateAnnouncementDto dto, [FromForm] IFormFile? photo)
    {
        if (!User.TryGetUserId(out var creatorUserId)) return Unauthorized();

        var title = dto.Title?.Trim() ?? string.Empty;
        var body = dto.Body?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title)) return BadRequest("Announcement title is required.");
        if (string.IsNullOrWhiteSpace(body)) return BadRequest("Announcement body is required.");
        StoredPhotoInfo? storedPhoto = null;

        if (photo != null)
        {
            try
            {
                storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                    photo,
                    Request,
                    cancellationToken: HttpContext.RequestAborted);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        var announcement = new Announcement
        {
            Title = title,
            Body = body,
            PhotoUrl = storedPhoto?.PhotoUrl,
            CreatedByUserId = creatorUserId,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (storedPhoto != null)
            {
                TryDeleteFile(storedPhoto.FilePath);
            }

            throw;
        }

        var createdAnnouncement = await _context.Announcements
            .AsNoTracking()
            .Include(a => a.CreatedByUser)
            .Where(a => a.Id == announcement.Id)
            .FirstAsync();

        var created = AnnouncementPollMapper.ToAnnouncementDto(createdAnnouncement, Array.Empty<AnnouncementPollVote>());
        return Ok(created);
    }

    [HttpPut("announcements/{announcementId:int}")]
    public async Task<ActionResult<AnnouncementDto>> UpdateAnnouncement(
        int announcementId,
        [FromForm] UpdateAnnouncementDto dto,
        [FromForm] IFormFile? photo)
    {
        var announcement = await _context.Announcements
            .Include(a => a.CreatedByUser)
            .FirstOrDefaultAsync(a => a.Id == announcementId);
        if (announcement == null) return NotFound();

        var title = dto.Title?.Trim() ?? string.Empty;
        var body = dto.Body?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title)) return BadRequest("Announcement title is required.");
        if (string.IsNullOrWhiteSpace(body)) return BadRequest("Announcement body is required.");

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        var hasExistingLocalPhoto = TryGetLocalSeniorsPhotoPath(announcement.PhotoUrl, photosDirectory, out var existingLocalPhotoPath);

        StoredPhotoInfo? storedPhoto = null;
        if (photo != null)
        {
            try
            {
                storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                    photo,
                    Request,
                    cancellationToken: HttpContext.RequestAborted);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        var oldBody = announcement.Body;
        announcement.Title = title;
        announcement.Body = body;

        if (dto.RemovePhoto)
        {
            announcement.PhotoUrl = null;
        }

        if (storedPhoto != null)
        {
            announcement.PhotoUrl = storedPhoto.PhotoUrl;
        }

        try
        {
            if (!string.Equals(oldBody, body, StringComparison.Ordinal))
            {
                var pollVotes = await _context.AnnouncementPollVotes
                    .Where(v => v.AnnouncementId == announcementId)
                    .ToListAsync();
                if (pollVotes.Count > 0)
                {
                    _context.AnnouncementPollVotes.RemoveRange(pollVotes);
                }
            }

            await _context.SaveChangesAsync();
        }
        catch
        {
            if (storedPhoto != null)
            {
                TryDeleteFile(storedPhoto.FilePath);
            }

            throw;
        }

        if (hasExistingLocalPhoto && (dto.RemovePhoto || storedPhoto != null))
        {
            TryDeleteFile(existingLocalPhotoPath);
        }

        var updatedVotes = await _context.AnnouncementPollVotes
            .AsNoTracking()
            .Include(v => v.User)
            .Where(v => v.AnnouncementId == announcementId)
            .ToListAsync();

        return Ok(AnnouncementPollMapper.ToAnnouncementDto(announcement, updatedVotes));
    }

    [HttpDelete("announcements/{announcementId:int}")]
    public async Task<ActionResult> DeleteAnnouncement(int announcementId)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == announcementId);
        if (announcement == null) return NotFound();
        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        var hasLocalPhoto = TryGetLocalSeniorsPhotoPath(announcement.PhotoUrl, photosDirectory, out var localPhotoPath);

        _context.Announcements.Remove(announcement);
        await _context.SaveChangesAsync();

        if (hasLocalPhoto)
        {
            TryDeleteFile(localPhotoPath);
        }

        return NoContent();
    }

    [HttpGet("events")]
    public async Task<ActionResult<IReadOnlyList<PortalEventDto>>> GetEvents(
        [FromQuery] int maxCount = 50,
        [FromQuery] bool includePast = true)
    {
        var safeMaxCount = maxCount < 1 ? 10 : Math.Min(maxCount, 200);
        var today = DateTime.UtcNow.Date;

        var query = _context.Events
            .AsNoTracking()
            .AsQueryable();

        if (!includePast)
        {
            query = query.Where(e => e.EventDate.Date >= today);
        }

        var items = await query
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

        return Ok(items);
    }

    [HttpPost("events")]
    public async Task<ActionResult<PortalEventDto>> CreateEvent([FromForm] CreatePortalEventDto dto, [FromForm] IFormFile? photo)
    {
        if (!User.TryGetUserId(out var creatorUserId)) return Unauthorized();

        var title = dto.Title?.Trim() ?? string.Empty;
        var location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
        var details = string.IsNullOrWhiteSpace(dto.Details) ? null : dto.Details.Trim();

        if (string.IsNullOrWhiteSpace(title)) return BadRequest("Event title is required.");
        if (dto.EventDate == default) return BadRequest("Event date is required.");
        StoredPhotoInfo? storedPhoto = null;

        if (photo != null)
        {
            try
            {
                storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                    photo,
                    Request,
                    cancellationToken: HttpContext.RequestAborted);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        var portalEvent = new PortalEvent
        {
            Title = title,
            EventDate = dto.EventDate,
            Location = location,
            Details = details,
            PhotoUrl = storedPhoto?.PhotoUrl,
            CreatedByUserId = creatorUserId,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _context.Events.Add(portalEvent);
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (storedPhoto != null)
            {
                TryDeleteFile(storedPhoto.FilePath);
            }

            throw;
        }

        var created = await _context.Events
            .AsNoTracking()
            .Where(e => e.Id == portalEvent.Id)
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
            .FirstAsync();

        return Ok(created);
    }

    [HttpPut("events/{eventId:int}")]
    public async Task<ActionResult<PortalEventDto>> UpdateEvent(
        int eventId,
        [FromForm] UpdatePortalEventDto dto,
        [FromForm] IFormFile? photo)
    {
        var portalEvent = await _context.Events
            .Include(e => e.CreatedByUser)
            .FirstOrDefaultAsync(e => e.Id == eventId);
        if (portalEvent == null) return NotFound();

        var title = dto.Title?.Trim() ?? string.Empty;
        var location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
        var details = string.IsNullOrWhiteSpace(dto.Details) ? null : dto.Details.Trim();

        if (string.IsNullOrWhiteSpace(title)) return BadRequest("Event title is required.");
        if (dto.EventDate == default) return BadRequest("Event date is required.");

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        var hasExistingLocalPhoto = TryGetLocalSeniorsPhotoPath(portalEvent.PhotoUrl, photosDirectory, out var existingLocalPhotoPath);

        StoredPhotoInfo? storedPhoto = null;
        if (photo != null)
        {
            try
            {
                storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                    photo,
                    Request,
                    cancellationToken: HttpContext.RequestAborted);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        portalEvent.Title = title;
        portalEvent.EventDate = dto.EventDate;
        portalEvent.Location = location;
        portalEvent.Details = details;

        if (dto.RemovePhoto)
        {
            portalEvent.PhotoUrl = null;
        }

        if (storedPhoto != null)
        {
            portalEvent.PhotoUrl = storedPhoto.PhotoUrl;
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (storedPhoto != null)
            {
                TryDeleteFile(storedPhoto.FilePath);
            }

            throw;
        }

        if (hasExistingLocalPhoto && (dto.RemovePhoto || storedPhoto != null))
        {
            TryDeleteFile(existingLocalPhotoPath);
        }

        return Ok(new PortalEventDto
        {
            Id = portalEvent.Id,
            Title = portalEvent.Title,
            EventDate = portalEvent.EventDate,
            Location = portalEvent.Location,
            Details = portalEvent.Details,
            PhotoUrl = portalEvent.PhotoUrl,
            CreatedAt = portalEvent.CreatedAt,
            CreatedByUsername = portalEvent.CreatedByUser.Username
        });
    }

    [HttpDelete("events/{eventId:int}")]
    public async Task<ActionResult> DeleteEvent(int eventId)
    {
        var portalEvent = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
        if (portalEvent == null) return NotFound();
        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        var hasLocalPhoto = TryGetLocalSeniorsPhotoPath(portalEvent.PhotoUrl, photosDirectory, out var localPhotoPath);

        _context.Events.Remove(portalEvent);
        await _context.SaveChangesAsync();

        if (hasLocalPhoto)
        {
            TryDeleteFile(localPhotoPath);
        }

        return NoContent();
    }

    [HttpGet("memoryboard/photos")]
    public async Task<ActionResult<IReadOnlyList<MemoryBoardPhotoDto>>> GetMemoryBoardPhotos(
        [FromQuery] MemoryBoardPhotoStatus status = MemoryBoardPhotoStatus.Pending,
        [FromQuery] int maxCount = 200)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        var safeMaxCount = maxCount < 1 ? 50 : Math.Min(maxCount, 1000);

        var query = _context.MemoryBoardPhotos
            .AsNoTracking()
            .Where(p => p.Status == status);

        if (status == MemoryBoardPhotoStatus.Approved)
        {
            query = query
                .OrderBy(p => p.ExifTakenAtUtc ?? p.CreatedAt)
                .ThenBy(p => p.CreatedAt);
        }
        else
        {
            query = query.OrderByDescending(p => p.CreatedAt);
        }

        var items = await query
            .Take(safeMaxCount)
            .Select(p => new MemoryBoardPhotoDto
            {
                Id = p.Id,
                Username = p.User.Username,
                PhotoUrl = p.PhotoUrl,
                Status = p.Status,
                CreatedAt = p.CreatedAt,
                ExifTakenAtUtc = p.ExifTakenAtUtc,
                SortDateUtc = p.ExifTakenAtUtc ?? p.CreatedAt,
                IsOwnedByCurrentUser = p.UserId == currentUserId
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("memoryboard/photos/{photoId:int}/decision")]
    public async Task<ActionResult<MemoryBoardPhotoDto>> ReviewMemoryBoardPhoto(int photoId, ReviewMemoryBoardPhotoDto dto)
    {
        if (!User.TryGetUserId(out var reviewerUserId)) return Unauthorized();

        var photo = await _context.MemoryBoardPhotos
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == photoId);
        if (photo == null) return NotFound();
        if (photo.Status != MemoryBoardPhotoStatus.Pending)
        {
            return BadRequest("Photo is already reviewed.");
        }

        if (dto.Decision == MemoryBoardPhotoDecision.Reject)
        {
            var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
            var hasLocalPhoto = TryGetLocalSeniorsPhotoPath(photo.PhotoUrl, photosDirectory, out var localPhotoPath);

            _context.MemoryBoardPhotos.Remove(photo);
            await _context.SaveChangesAsync();

            if (hasLocalPhoto)
            {
                TryDeleteFile(localPhotoPath);
            }

            var rejected = new MemoryBoardPhotoDto
            {
                Id = photo.Id,
                Username = photo.User.Username,
                PhotoUrl = photo.PhotoUrl,
                Status = MemoryBoardPhotoStatus.Rejected,
                CreatedAt = photo.CreatedAt,
                ExifTakenAtUtc = photo.ExifTakenAtUtc,
                SortDateUtc = photo.ExifTakenAtUtc ?? photo.CreatedAt,
                IsOwnedByCurrentUser = photo.UserId == reviewerUserId
            };

            return Ok(rejected);
        }

        photo.Status = MemoryBoardPhotoStatus.Approved;
        photo.ReviewedByUserId = reviewerUserId;
        photo.ReviewedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await _context.MemoryBoardPhotos
            .AsNoTracking()
            .Where(p => p.Id == photoId)
            .Select(p => new MemoryBoardPhotoDto
            {
                Id = p.Id,
                Username = p.User.Username,
                PhotoUrl = p.PhotoUrl,
                Status = p.Status,
                CreatedAt = p.CreatedAt,
                ExifTakenAtUtc = p.ExifTakenAtUtc,
                SortDateUtc = p.ExifTakenAtUtc ?? p.CreatedAt,
                IsOwnedByCurrentUser = p.UserId == reviewerUserId
            })
            .FirstAsync();

        return Ok(updated);
    }

    [HttpDelete("memoryboard/photos/{photoId:int}")]
    public async Task<ActionResult> DeleteMemoryBoardPhoto(int photoId)
    {
        var photo = await _context.MemoryBoardPhotos.FirstOrDefaultAsync(p => p.Id == photoId);
        if (photo == null) return NotFound();

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        var hasLocalPhoto = TryGetLocalSeniorsPhotoPath(photo.PhotoUrl, photosDirectory, out var localPhotoPath);

        _context.MemoryBoardPhotos.Remove(photo);
        await _context.SaveChangesAsync();

        if (hasLocalPhoto)
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
