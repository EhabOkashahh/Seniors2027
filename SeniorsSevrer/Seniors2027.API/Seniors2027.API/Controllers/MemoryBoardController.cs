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
    IImageUploadProcessor imageUploadProcessor) : ControllerBase
{
    private readonly AppDbContext _context = context;
    private readonly IImageUploadProcessor _imageUploadProcessor = imageUploadProcessor;

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
