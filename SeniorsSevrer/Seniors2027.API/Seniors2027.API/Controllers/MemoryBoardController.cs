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
[Route("api/memoryboard")]
[Authorize]
public class MemoryBoardController(
    AppDbContext context,
    IImageUploadProcessor imageUploadProcessor,
    IWebHostEnvironment environment) : ControllerBase
{
    private readonly AppDbContext _context = context;
    private readonly IImageUploadProcessor _imageUploadProcessor = imageUploadProcessor;
    private readonly IWebHostEnvironment _environment = environment;

    [HttpGet("photos")]
    public async Task<ActionResult<IReadOnlyList<MemoryBoardPhotoDto>>> GetApprovedPhotos([FromQuery] int maxCount = 2000)
    {
        var safeMaxCount = maxCount < 1 ? 200 : Math.Min(maxCount, 5000);

        var items = await _context.MemoryBoardPhotos
            .AsNoTracking()
            .Where(p => p.Status == MemoryBoardPhotoStatus.Approved)
            .OrderBy(p => p.ExifTakenAtUtc ?? p.CreatedAt)
            .ThenBy(p => p.CreatedAt)
            .Take(safeMaxCount)
            .Select(p => new MemoryBoardPhotoDto
            {
                Id = p.Id,
                UserId = p.UserId,
                Username = p.User.Username,
                PhotoUrl = p.PhotoUrl,
                Status = p.Status,
                CreatedAt = p.CreatedAt,
                ExifTakenAtUtc = p.ExifTakenAtUtc,
                SortDateUtc = p.ExifTakenAtUtc ?? p.CreatedAt,
                ReviewedAtUtc = p.ReviewedAtUtc,
                ReviewedByUserId = p.ReviewedByUserId,
                ReviewedByUsername = p.ReviewedByUser != null ? p.ReviewedByUser.Username : null
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("my/photos")]
    public async Task<ActionResult<IReadOnlyList<MemoryBoardPhotoDto>>> GetMyPhotos(
        [FromQuery] MemoryBoardPhotoStatus status = MemoryBoardPhotoStatus.Pending,
        [FromQuery] int maxCount = 300)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var safeMaxCount = maxCount < 1 ? 100 : Math.Min(maxCount, 2000);

        var query = _context.MemoryBoardPhotos
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.Status == status);

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
                UserId = p.UserId,
                Username = p.User.Username,
                PhotoUrl = p.PhotoUrl,
                Status = p.Status,
                CreatedAt = p.CreatedAt,
                ExifTakenAtUtc = p.ExifTakenAtUtc,
                SortDateUtc = p.ExifTakenAtUtc ?? p.CreatedAt,
                ReviewedAtUtc = p.ReviewedAtUtc,
                ReviewedByUserId = p.ReviewedByUserId,
                ReviewedByUsername = p.ReviewedByUser != null ? p.ReviewedByUser.Username : null
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("photos")]
    public async Task<ActionResult<MemoryBoardPhotoDto>> UploadPhoto([FromForm] IFormFile photo)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (photo == null || photo.Length == 0) return BadRequest("Photo is required.");
        var requesterIsAdmin = User.IsInRole(nameof(UserRole.Admin));

        StoredPhotoInfo? storedPhoto;
        try
        {
            storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                photo,
                Request,
                ImageUploadPurpose.MemoryBoard,
                cancellationToken: HttpContext.RequestAborted);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        var memoryPhoto = new MemoryBoardPhoto
        {
            UserId = userId,
            PhotoUrl = storedPhoto.PhotoUrl,
            ExifTakenAtUtc = storedPhoto.ExifTakenAtUtc,
            Status = requesterIsAdmin ? MemoryBoardPhotoStatus.Approved : MemoryBoardPhotoStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ReviewedAtUtc = requesterIsAdmin ? DateTime.UtcNow : null,
            ReviewedByUserId = requesterIsAdmin ? userId : null
        };

        try
        {
            _context.MemoryBoardPhotos.Add(memoryPhoto);
            await _context.SaveChangesAsync();
        }
        catch
        {
            TryDeleteFile(storedPhoto.FilePath);
            throw;
        }

        var created = await _context.MemoryBoardPhotos
            .AsNoTracking()
            .Where(p => p.Id == memoryPhoto.Id)
            .Select(p => new MemoryBoardPhotoDto
            {
                Id = p.Id,
                UserId = p.UserId,
                Username = p.User.Username,
                PhotoUrl = p.PhotoUrl,
                Status = p.Status,
                CreatedAt = p.CreatedAt,
                ExifTakenAtUtc = p.ExifTakenAtUtc,
                SortDateUtc = p.ExifTakenAtUtc ?? p.CreatedAt,
                ReviewedAtUtc = p.ReviewedAtUtc,
                ReviewedByUserId = p.ReviewedByUserId,
                ReviewedByUsername = p.ReviewedByUser != null ? p.ReviewedByUser.Username : null
            })
            .FirstAsync();

        return Ok(created);
    }

    [HttpDelete("my/photos/{photoId:int}")]
    public async Task<ActionResult> DeleteMyPhoto(int photoId)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var requesterIsAdmin = User.IsInRole(nameof(UserRole.Admin));

        var photo = requesterIsAdmin
            ? await _context.MemoryBoardPhotos.FirstOrDefaultAsync(p => p.Id == photoId)
            : await _context.MemoryBoardPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.UserId == userId);
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

    private static bool TryGetLocalSeniorsPhotoPath(string? photoUrl, string photosDirectory, out string filePath)
    {
        filePath = string.Empty;
        if (string.IsNullOrWhiteSpace(photoUrl)) return false;
        if (!photoUrl.Contains("/SeniorsPhotos/", StringComparison.OrdinalIgnoreCase)) return false;

        string fileName;
        if (Uri.TryCreate(photoUrl, UriKind.Absolute, out var uri))
        {
            fileName = Path.GetFileName(uri.LocalPath);
        }
        else
        {
            fileName = Path.GetFileName(photoUrl);
        }

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
