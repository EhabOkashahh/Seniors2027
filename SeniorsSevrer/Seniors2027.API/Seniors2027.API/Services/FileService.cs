using Seniors2027.BLL.Interfaces;

namespace Seniors2027.API.Services;

public sealed class FileService : IFileService
{
    private readonly string _challengeMediaDirectory;
    private readonly string _seniorsPhotosDirectory;
    private readonly ICloudinaryService _cloudinaryService;

    public FileService(IWebHostEnvironment environment, ICloudinaryService cloudinaryService)
    {
        _cloudinaryService = cloudinaryService;
        _challengeMediaDirectory = Path.Combine(environment.ContentRootPath, "ChallengeMedia");
        _seniorsPhotosDirectory = Path.Combine(environment.ContentRootPath, "SeniorsPhotos");
        try
        {
            Directory.CreateDirectory(_challengeMediaDirectory);
        }
        catch
        {
        }
    }

    public void DeleteFileIfExists(string absolutePath)
    {
        if (!string.IsNullOrWhiteSpace(absolutePath) && System.IO.File.Exists(absolutePath))
        {
            System.IO.File.Delete(absolutePath);
        }
    }

    public string GetChallengeMediaDirectory() => _challengeMediaDirectory;

    public async Task<bool> TryDeleteMediaByUrlAsync(string mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return false;
        }

        if (mediaUrl.Contains("res.cloudinary.com", StringComparison.OrdinalIgnoreCase))
        {
            return await _cloudinaryService.DeleteResourceByUrlAsync(mediaUrl);
        }

        if (mediaUrl.Contains("/ChallengeMedia/", StringComparison.OrdinalIgnoreCase) ||
            mediaUrl.Contains("/SeniorsPhotos/", StringComparison.OrdinalIgnoreCase))
        {
            var localPath = ResolveLocalPath(mediaUrl);
            if (localPath != null)
            {
                DeleteFileIfExists(localPath);
                return true;
            }
        }

        return false;
    }

    private string? ResolveLocalPath(string mediaUrl)
    {
        if (!Uri.TryCreate(mediaUrl, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var fileName = Path.GetFileName(uri.LocalPath);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return null;
        }

        if (mediaUrl.Contains("/ChallengeMedia/", StringComparison.OrdinalIgnoreCase))
        {
            return Path.Combine(_challengeMediaDirectory, fileName);
        }

        if (mediaUrl.Contains("/SeniorsPhotos/", StringComparison.OrdinalIgnoreCase))
        {
            return Path.Combine(_seniorsPhotosDirectory, fileName);
        }

        return null;
    }
}
