using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DailyHighlightsController : ControllerBase
{
    private readonly IDailyHighlightService _dailyHighlightService;
    private readonly IWebHostEnvironment _environment;
    private readonly IImageUploadProcessor _imageUploadProcessor;
    private readonly IDailyHighlightsRealtimeNotifier _highlightsRealtimeNotifier;
    private readonly IAppUpdatesRealtimeNotifier _appUpdatesRealtimeNotifier;

    public DailyHighlightsController(
        IDailyHighlightService dailyHighlightService,
        IWebHostEnvironment environment,
        IImageUploadProcessor imageUploadProcessor,
        IDailyHighlightsRealtimeNotifier highlightsRealtimeNotifier,
        IAppUpdatesRealtimeNotifier appUpdatesRealtimeNotifier)
    {
        _dailyHighlightService = dailyHighlightService;
        _environment = environment;
        _imageUploadProcessor = imageUploadProcessor;
        _highlightsRealtimeNotifier = highlightsRealtimeNotifier;
        _appUpdatesRealtimeNotifier = appUpdatesRealtimeNotifier;
    }

    [HttpGet("active")]
    public async Task<ActionResult<IReadOnlyList<DailyHighlightDto>>> GetActive([FromQuery] int maxCount = 0)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        var highlights = await _dailyHighlightService.GetActiveHighlightsAsync(maxCount, requesterUserId);
        return Ok(highlights);
    }

    [HttpGet("archive")]
    public async Task<ActionResult<IReadOnlyList<DailyHighlightDto>>> GetArchive([FromQuery] int maxCount = 300)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        var highlights = await _dailyHighlightService.GetHighlightsArchiveAsync(maxCount, requesterUserId);
        return Ok(highlights);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<DailyHighlightDto>> UploadDailyHighlight([FromForm] IFormFile photo)
    {
        if (photo == null || photo.Length == 0) return BadRequest("Photo is required.");

        if (!User.TryGetUserId(out var userId)) return Unauthorized();

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
            await _highlightsRealtimeNotifier.NotifyHighlightsUpdatedAsync(HttpContext.RequestAborted);
            await _appUpdatesRealtimeNotifier.NotifyDailyHighlightsUpdatedAsync(HttpContext.RequestAborted);
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
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var requesterIsAdmin = User.IsInRole(nameof(UserRole.Admin));

        var deleted = await _dailyHighlightService.DeleteHighlightAsync(id, userId, requesterIsAdmin);
        if (deleted == null) return NotFound();

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);
        if (TryGetLocalSeniorsPhotoPath(deleted.PhotoUrl, photosDirectory, out var photoPath) && System.IO.File.Exists(photoPath))
        {
            System.IO.File.Delete(photoPath);
        }

        await _highlightsRealtimeNotifier.NotifyHighlightsUpdatedAsync(HttpContext.RequestAborted);
        await _appUpdatesRealtimeNotifier.NotifyDailyHighlightsUpdatedAsync(HttpContext.RequestAborted);
        return Ok(deleted);
    }

    [HttpPost("{id:int}/reactions")]
    public async Task<ActionResult<DailyHighlightDto>> ToggleReaction(int id, [FromBody] ToggleDailyHighlightReactionRequest dto)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (!Enum.IsDefined(dto.Type)) return BadRequest("Invalid reaction type.");

        var updated = await _dailyHighlightService.ToggleReactionAsync(id, userId, dto.Type);
        if (updated == null) return NotFound();

        await _highlightsRealtimeNotifier.NotifyHighlightsUpdatedAsync(HttpContext.RequestAborted);
        await _appUpdatesRealtimeNotifier.NotifyDailyHighlightsUpdatedAsync(HttpContext.RequestAborted);
        return Ok(updated);
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

public class ToggleDailyHighlightReactionRequest
{
    public DailyHighlightReactionType Type { get; set; }
}
