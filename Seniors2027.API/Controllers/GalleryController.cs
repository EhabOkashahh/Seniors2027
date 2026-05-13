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
public class GalleryController : ControllerBase
{
    private readonly IGalleryService _galleryService;
    private readonly IWebHostEnvironment _environment;

    public GalleryController(IGalleryService galleryService, IWebHostEnvironment environment)
    {
        _galleryService = galleryService;
        _environment = environment;
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
            var photoUrl = await SavePhotoAsync(photo);
            var created = await _galleryService.AddPhotoAsync(userId, photoUrl);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
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
}
