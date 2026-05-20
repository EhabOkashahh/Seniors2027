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
public class GalleryController : ControllerBase
{
    private readonly IGalleryService _galleryService;
    private readonly IWebHostEnvironment _environment;
    private readonly IImageUploadProcessor _imageUploadProcessor;

    public GalleryController(IGalleryService galleryService, IWebHostEnvironment environment, IImageUploadProcessor imageUploadProcessor)
    {
        _galleryService = galleryService;
        _environment = environment;
        _imageUploadProcessor = imageUploadProcessor;
    }

    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<IReadOnlyList<GalleryPhotoDto>>> GetUserGallery(int userId)
    {
        var photos = await _galleryService.GetUserPhotosAsync(userId);
        return Ok(photos);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<GalleryPhotoDto>> UploadToMyGallery([FromForm] IFormFile photo)
    {
        if (photo == null || photo.Length == 0) return BadRequest("Photo is required.");

        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
        if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

        try
        {
            var storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                photo,
                Request,
                cancellationToken: HttpContext.RequestAborted);
            var created = await _galleryService.AddPhotoAsync(userId, storedPhoto.PhotoUrl);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<GalleryPhotoDto>> DeletePhoto(int id)
    {
        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
        if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var requesterIsAdmin = User.IsInRole(nameof(UserRole.Admin));

        try
        {
            var deleted = await _galleryService.DeletePhotoAsync(id, userId, requesterIsAdmin);
            if (deleted == null) return NotFound();

            var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
            Directory.CreateDirectory(photosDirectory);
            if (TryGetLocalSeniorsPhotoPath(deleted.PhotoUrl, photosDirectory, out var photoPath) && System.IO.File.Exists(photoPath))
            {
                System.IO.File.Delete(photoPath);
            }

            return Ok(deleted);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
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
}
