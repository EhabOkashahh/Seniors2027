using System.Text.RegularExpressions;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace Seniors2027.API.Services;

public sealed class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryService(IConfiguration configuration)
    {
        var cloudName = configuration["Cloudinary:CloudName"] ?? "";
        var apiKey = configuration["Cloudinary:ApiKey"] ?? "";
        var apiSecret = configuration["Cloudinary:ApiSecret"] ?? "";

        if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
        {
            throw new InvalidOperationException("Cloudinary credentials are not configured.");
        }

        _cloudinary = new Cloudinary(new Account(cloudName, apiKey, apiSecret));
    }

    public async Task<CloudinaryUploadResult> UploadImageAsync(Stream fileStream, string fileName, string folder)
    {
        var publicId = string.IsNullOrWhiteSpace(folder)
            ? Path.GetFileNameWithoutExtension(fileName)
            : $"{folder.TrimEnd('/')}/{Path.GetFileNameWithoutExtension(fileName)}";

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            PublicId = publicId,
            Overwrite = true
        };

        var result = await _cloudinary.UploadAsync(uploadParams);
        ThrowIfFailed(result);

        return new CloudinaryUploadResult(result.SecureUrl.ToString(), result.PublicId);
    }

    public async Task<CloudinaryUploadResult> UploadImageFromPathAsync(string localFilePath, string fileName, string folder)
    {
        await using var stream = File.OpenRead(localFilePath);
        return await UploadImageAsync(stream, fileName, folder);
    }

    public async Task<CloudinaryUploadResult> UploadRawAsync(Stream fileStream, string fileName, string folder)
    {
        var publicId = string.IsNullOrWhiteSpace(folder)
            ? Path.GetFileNameWithoutExtension(fileName)
            : $"{folder.TrimEnd('/')}/{Path.GetFileNameWithoutExtension(fileName)}";

        var uploadParams = new RawUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            PublicId = publicId,
            Overwrite = true
        };

        var result = await _cloudinary.UploadAsync(uploadParams);
        ThrowIfFailed(result);

        return new CloudinaryUploadResult(result.SecureUrl.ToString(), result.PublicId);
    }

    public async Task<bool> DeleteResourceByUrlAsync(string cloudinaryUrl)
    {
        if (string.IsNullOrWhiteSpace(cloudinaryUrl))
        {
            return false;
        }

        var publicId = ExtractPublicId(cloudinaryUrl);
        if (publicId == null)
        {
            return false;
        }

        var resourceType = DetectResourceType(cloudinaryUrl);

        var deleteParams = new DelResParams
        {
            PublicIds = new List<string> { publicId },
            Type = "upload",
            ResourceType = resourceType
        };

        var result = await _cloudinary.DeleteResourcesAsync(deleteParams);
        return result.StatusCode == System.Net.HttpStatusCode.OK;
    }

    private static string? ExtractPublicId(string url)
    {
        var match = Regex.Match(url, @"/upload/(?:[^/]+/)*v\d+/(.+?)(?:\.[a-z0-9]+)?$", RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    private static ResourceType DetectResourceType(string url)
    {
        if (url.Contains("/video/", StringComparison.OrdinalIgnoreCase))
        {
            return ResourceType.Video;
        }
        if (url.Contains("/raw/", StringComparison.OrdinalIgnoreCase))
        {
            return ResourceType.Raw;
        }
        return ResourceType.Image;
    }

    private static void ThrowIfFailed(UploadResult result)
    {
        if (result.StatusCode != System.Net.HttpStatusCode.OK)
        {
            var error = result.Error?.Message ?? "Unknown Cloudinary error";
            throw new InvalidOperationException($"Cloudinary upload failed: {error}");
        }
    }
}
