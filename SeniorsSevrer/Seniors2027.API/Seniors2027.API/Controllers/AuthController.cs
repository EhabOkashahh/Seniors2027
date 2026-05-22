using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;
using System.Text.Json;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService _authService, IUnitOfWork _unitOfWork, IWebHostEnvironment _environment, IImageUploadProcessor _imageUploadProcessor) : ControllerBase
{
    [Authorize]
    [HttpGet("me")]
    public ActionResult GetMe()
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var user = _unitOfWork.Repository<User>()
            .Find(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.PhotoUrl,
                u.Description,
                u.SocialLinksJson,
                u.Role
            })
            .FirstOrDefault();
        if (user == null) return NotFound();

        return Ok(new
        {
            id = user.Id,
            username = string.IsNullOrWhiteSpace(user.Username) ? "Senior" : user.Username,
            photoUrl = string.IsNullOrWhiteSpace(user.PhotoUrl) ? null : user.PhotoUrl,
            description = string.IsNullOrWhiteSpace(user.Description) ? null : user.Description,
            socialLinks = ParseSocialLinks(user.SocialLinksJson),
            role = user.Role
        });
    }

    [Authorize]
    [HttpPut("me/username")]
    public async Task<ActionResult> UpdateMyUsername(UpdateUsernameDto dto)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        try
        {
            var updated = await _authService.UpdateUsernameAsync(userId, dto.Username);
            if (!updated) return NotFound();

            return Ok(new { message = "Username updated successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [Authorize]
    [HttpGet("me/username-availability")]
    public async Task<ActionResult> CheckMyUsernameAvailability([FromQuery] string username)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var trimmedUsername = username.Trim();
        if (string.IsNullOrWhiteSpace(trimmedUsername))
        {
            return BadRequest("Username is required.");
        }

        var exists = await _authService.IsUsernameTakenAsync(trimmedUsername, userId);
        return Ok(new
        {
            username = trimmedUsername,
            exists,
            available = !exists
        });
    }

    [Authorize]
    [HttpPut("me/description")]
    public async Task<ActionResult> UpdateMyDescription(UpdateDescriptionDto dto)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var updated = await _authService.UpdateDescriptionAsync(userId, dto.Description);
        if (!updated) return NotFound();

        return Ok(new { message = "Description updated successfully." });
    }

    [Authorize]
    [HttpPut("me/social-links")]
    public async Task<ActionResult> UpdateMySocialLinks(UpdateSocialLinksDto dto)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var updated = await _authService.UpdateSocialLinksAsync(userId, dto.Links);
        if (!updated) return NotFound();

        var user = _unitOfWork.Repository<User>()
            .Find(u => u.Id == userId)
            .Select(u => new { u.SocialLinksJson })
            .FirstOrDefault();

        if (user == null) return NotFound();

        return Ok(new
        {
            message = "Social links updated successfully.",
            socialLinks = ParseSocialLinks(user.SocialLinksJson)
        });
    }

    [Authorize]
    [HttpPut("me/gender")]
    public async Task<ActionResult> UpdateMyGender(UpdateGenderDto dto)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var updated = await _authService.UpdateGenderAsync(userId, dto.Gender);
        if (!updated) return NotFound();

        return Ok(new { message = "Gender updated successfully." });
    }

    [HttpGet("recognize/{email}")]
    public ActionResult Recognize(string email)
    {
        var normalizedEmail = email.Trim();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return Ok(new { exists = false });
        }

        var lowerEmail = normalizedEmail.ToLowerInvariant();
        var exists = _unitOfWork.Repository<User>()
            .Find(u => u.Email != null && u.Email.ToLower() == lowerEmail)
            .Any();

        return Ok(new { exists });
    }

    // [HttpPost("register")]
    // public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto registerDto) 
    // {
    //     try
    //     {
    //         var result = await _authService.RegisterAsync(registerDto);
    //         return Ok(result);
    //     }
    //     catch (Exception ex)
    //     {
    //         return BadRequest(ex.Message);
    //     }
    // }

    [HttpPost("upload-photo")]
    public async Task<ActionResult> UploadPhoto([FromForm] IFormFile photo)
    {
        try
        {
            var storedPhoto = await _imageUploadProcessor.SaveProcessedPhotoAsync(
                photo,
                Request,
                cancellationToken: HttpContext.RequestAborted);
            return Ok(new
            {
                photoUrl = storedPhoto.PhotoUrl,
                savedFileName = storedPhoto.FileName,
                savedPath = storedPhoto.FilePath
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [Authorize]
    [HttpPut("me/photo")]
    public async Task<ActionResult> UpdateMyPhoto([FromForm] IFormFile photo)
    {
        if (photo == null || photo.Length == 0) return BadRequest("Photo is required.");
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        var user = _unitOfWork.Repository<User>().Find(u => u.Id == userId).FirstOrDefault();
        if (user == null) return NotFound();

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);

        StoredPhotoInfo storedPhoto;
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

        var oldPhotoPath = string.Empty;
        var hadLocalOldPhoto = TryGetLocalSeniorsPhotoPath(user.PhotoUrl, photosDirectory, out oldPhotoPath) && System.IO.File.Exists(oldPhotoPath);

        user.PhotoUrl = storedPhoto.PhotoUrl;
        _unitOfWork.Repository<User>().Update(user);
        await _unitOfWork.CompleteAsync();

        if (hadLocalOldPhoto)
        {
            System.IO.File.Delete(oldPhotoPath);
        }

        return Ok(new
        {
            photoUrl = storedPhoto.PhotoUrl,
            savedFileName = storedPhoto.FileName,
            savedPath = storedPhoto.FilePath
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginStartResponseDto>> Login(LoginDto loginDto)
    {
        try
        {
            var result = await _authService.LoginAsync(loginDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResponseDto>> VerifyOtp(VerifyOtpDto verifyOtpDto)
    {
        try
        {
            var result = await _authService.VerifyOtpAsync(verifyOtpDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Unauthorized(ex.Message);
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

    private static IReadOnlyList<string> ParseSocialLinks(string? socialLinksJson)
    {
        if (string.IsNullOrWhiteSpace(socialLinksJson)) return Array.Empty<string>();

        try
        {
            var links = JsonSerializer.Deserialize<List<string>>(socialLinksJson) ?? new List<string>();
            var normalized = new List<string>();

            foreach (var link in links)
            {
                if (string.IsNullOrWhiteSpace(link)) continue;

                var candidate = link.Trim();
                if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) continue;
                if (!IsSupportedWebScheme(uri.Scheme)) continue;

                if (normalized.Any(existing => string.Equals(existing, candidate, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                normalized.Add(candidate);
            }

            return normalized;
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static bool IsSupportedWebScheme(string scheme)
    {
        return string.Equals(scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || string.Equals(scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
    }

}
