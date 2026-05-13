using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DailyHighlightsController : ControllerBase
{
    private readonly IDailyHighlightService _dailyHighlightService;
    private readonly IWebHostEnvironment _environment;

    public DailyHighlightsController(IDailyHighlightService dailyHighlightService, IWebHostEnvironment environment)
    {
        _dailyHighlightService = dailyHighlightService;
        _environment = environment;
    }

    [HttpGet("active")]
    public async Task<ActionResult<IReadOnlyList<DailyHighlightDto>>> GetActive([FromQuery] int maxCount = 50)
    {
        var highlights = await _dailyHighlightService.GetActiveHighlightsAsync(maxCount);
        return Ok(highlights);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<DailyHighlightDto>> UploadDailyHighlight([FromForm] IFormFile photo)
    {
        if (photo == null || photo.Length == 0) return BadRequest("Photo is required.");

        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
        if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

        try
        {
            var photoUrl = await SavePhotoAsync(photo);
            var created = await _dailyHighlightService.AddHighlightAsync(userId, photoUrl);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteHighlight(int id)
    {
        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
        if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var deleted = await _dailyHighlightService.DeleteHighlightAsync(id, userId);
        if (deleted == null) return NotFound();

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);
        if (TryGetLocalSeniorsPhotoPath(deleted.PhotoUrl, photosDirectory, out var photoPath) && System.IO.File.Exists(photoPath))
        {
            System.IO.File.Delete(photoPath);
        }

        return Ok(deleted);
    }

    private async Task<string> SavePhotoAsync(IFormFile photo)
    {
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension)) throw new InvalidOperationException("Only jpg, jpeg, png, webp are allowed.");

        const long maxSize = 5 * 1024 * 1024;
        if (photo.Length > maxSize) throw new InvalidOperationException("Photo size must be <= 5 MB.");

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);
        var filePath = Path.Combine(photosDirectory, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await photo.CopyToAsync(stream);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        return $"{baseUrl}/SeniorsPhotos/{fileName}";
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
}
