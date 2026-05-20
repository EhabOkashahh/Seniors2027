using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
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
    private readonly IImageUploadProcessor _imageUploadProcessor;

    public DailyHighlightsController(IDailyHighlightService dailyHighlightService, IWebHostEnvironment environment, IImageUploadProcessor imageUploadProcessor)
    {
        _dailyHighlightService = dailyHighlightService;
        _environment = environment;
        _imageUploadProcessor = imageUploadProcessor;
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

        StoredPhotoInfo storedPhoto;
        try
        {
            storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                photo,
                Request,
                ImageUploadPurpose.DailyHighlight,
                HttpContext.RequestAborted);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        try
        {
            var created = await _dailyHighlightService.AddHighlightAsync(userId, storedPhoto.PhotoUrl);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            TryDeleteFile(storedPhoto.FilePath);
            return BadRequest(ex.Message);
        }
        catch
        {
            TryDeleteFile(storedPhoto.FilePath);
            throw;
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteHighlight(int id)
    {
        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
        if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();
        var requesterIsAdmin = User.IsInRole(nameof(UserRole.Admin));

        var deleted = await _dailyHighlightService.DeleteHighlightAsync(id, userId, requesterIsAdmin);
        if (deleted == null) return NotFound();

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);
        if (TryGetLocalSeniorsPhotoPath(deleted.PhotoUrl, photosDirectory, out var photoPath) && System.IO.File.Exists(photoPath))
        {
            System.IO.File.Delete(photoPath);
        }

        return Ok(deleted);
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
            if (!string.IsNullOrWhiteSpace(filePath) && System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }
        catch
        {
            // Keep API response focused on the original request outcome.
        }
    }
}
