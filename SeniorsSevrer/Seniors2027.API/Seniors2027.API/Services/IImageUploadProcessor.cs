using Microsoft.AspNetCore.Http;

namespace Seniors2027.API.Services;

public enum ImageUploadPurpose
{
    Standard = 0,
    DailyHighlight = 1,
    MemoryBoard = 2
}

public interface IImageUploadProcessor
{
    Task<StoredPhotoInfo> SaveProcessedPhotoAsync(
        IFormFile photo,
        HttpRequest request,
        ImageUploadPurpose purpose = ImageUploadPurpose.Standard,
        CancellationToken cancellationToken = default,
        ImageCaptionOverlayRequest? captionOverlay = null);
}

public sealed record ImageCaptionOverlayRequest(
    string CaptionText,
    double VerticalPositionPercent);

public sealed record StoredPhotoInfo(
    string FileName,
    string FilePath,
    string PhotoUrl,
    DateTime? ExifTakenAtUtc = null);
