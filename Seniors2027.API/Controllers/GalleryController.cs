using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Services;
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
    private readonly IImageUploadProcessor _imageUploadProcessor;

    public GalleryController(IGalleryService galleryService, IImageUploadProcessor imageUploadProcessor)
    {
        _galleryService = galleryService;
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
            var storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(photo, Request, HttpContext.RequestAborted);
            var created = await _galleryService.AddPhotoAsync(userId, storedPhoto.PhotoUrl);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
