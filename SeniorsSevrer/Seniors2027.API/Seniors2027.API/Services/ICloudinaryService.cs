namespace Seniors2027.API.Services;

public interface ICloudinaryService
{
    Task<CloudinaryUploadResult> UploadImageAsync(Stream fileStream, string fileName, string folder);
    Task<CloudinaryUploadResult> UploadImageFromPathAsync(string localFilePath, string fileName, string folder);
    Task<CloudinaryUploadResult> UploadRawAsync(Stream fileStream, string fileName, string folder);
    Task<bool> DeleteResourceByUrlAsync(string cloudinaryUrl);
}
