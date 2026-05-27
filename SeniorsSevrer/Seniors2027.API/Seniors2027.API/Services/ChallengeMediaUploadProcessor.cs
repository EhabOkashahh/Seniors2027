using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Seniors2027.API.Services;

public sealed class ChallengeMediaUploadProcessor : IChallengeMediaUploadProcessor
{
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly string[] AllowedImageContentTypes = ["image/jpeg", "image/png", "image/webp"];
    
    private static readonly string[] AllowedVideoExtensions = [".mp4", ".webm", ".mov"];
    private static readonly string[] AllowedVideoContentTypes = ["video/mp4", "video/webm", "video/quicktime"];

    private static readonly string[] AllowedLogoExtensions = [".svg", ".jpg", ".jpeg", ".png", ".webp"];
    private static readonly string[] AllowedLogoContentTypes = ["image/svg+xml", "image/jpeg", "image/png", "image/webp"];

    private const long MaxImageSizeBytes = 5 * 1024 * 1024; // 5 MB
    private const long MaxVideoSizeBytes = 100 * 1024 * 1024; // 100 MB
    private const long MaxLogoSizeBytes = 5 * 1024 * 1024; // 5 MB

    private readonly IWebHostEnvironment _environment;

    public ChallengeMediaUploadProcessor(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveChallengeMediaAsync(
        IFormFile file,
        string expectedUploadType,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            throw new InvalidOperationException("File is required.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = file.ContentType.ToLowerInvariant();

        if (string.Equals(expectedUploadType, "Image", StringComparison.OrdinalIgnoreCase))
        {
            if (!AllowedImageExtensions.Contains(extension) || !AllowedImageContentTypes.Contains(contentType))
            {
                throw new InvalidOperationException("Only jpg, jpeg, png, and webp are allowed for user image submissions.");
            }
            if (file.Length > MaxImageSizeBytes)
            {
                throw new InvalidOperationException("Image size must be <= 5 MB.");
            }
        }
        else if (string.Equals(expectedUploadType, "Video", StringComparison.OrdinalIgnoreCase))
        {
            if (!AllowedVideoExtensions.Contains(extension) || !AllowedVideoContentTypes.Contains(contentType))
            {
                throw new InvalidOperationException("Only mp4, webm, and mov are allowed for videos.");
            }
            if (file.Length > MaxVideoSizeBytes)
            {
                throw new InvalidOperationException("Video size must be <= 100 MB.");
            }
        }
        else if (string.Equals(expectedUploadType, "Logo", StringComparison.OrdinalIgnoreCase))
        {
            if (!AllowedLogoExtensions.Contains(extension) || !AllowedLogoContentTypes.Contains(contentType))
            {
                throw new InvalidOperationException("Only svg, jpg, jpeg, png, and webp are allowed for logos.");
            }
            if (file.Length > MaxLogoSizeBytes)
            {
                throw new InvalidOperationException("Logo size must be <= 5 MB.");
            }
        }
        else
        {
            throw new InvalidOperationException($"Unsupported upload type: {expectedUploadType}");
        }

        var mediaDirectory = Path.Combine(_environment.ContentRootPath, "ChallengeMedia");
        Directory.CreateDirectory(mediaDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(mediaDirectory, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream, cancellationToken);

        return $"/ChallengeMedia/{fileName}";
    }
}

