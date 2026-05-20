using Microsoft.AspNetCore.Http;

namespace Seniors2027.API.Services;

public interface IImageUploadProcessor
{
    Task<StoredPhotoInfo> SaveProcessedPhotoAsync(IFormFile photo, HttpRequest request, CancellationToken cancellationToken = default);
}

public sealed record StoredPhotoInfo(string FileName, string FilePath, string PhotoUrl);
