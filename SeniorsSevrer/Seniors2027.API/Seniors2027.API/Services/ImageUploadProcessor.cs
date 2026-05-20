using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Seniors2027.API.Services;

public sealed class ImageUploadProcessor : IImageUploadProcessor
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxUploadSizeBytes = 5 * 1024 * 1024;
    private const int MaxImageDimension = 512;
    private const int OutputWebpQuality = 65;

    private readonly IWebHostEnvironment _environment;

    public ImageUploadProcessor(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<StoredPhotoInfo> SaveProcessedPhotoAsync(IFormFile photo, HttpRequest request, CancellationToken cancellationToken = default)
    {
        if (photo == null || photo.Length == 0)
        {
            throw new InvalidOperationException("Photo is required.");
        }

        var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Only jpg, jpeg, png, webp are allowed.");
        }

        if (photo.Length > MaxUploadSizeBytes)
        {
            throw new InvalidOperationException("Photo size must be <= 5 MB.");
        }

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);

        var fileName = $"{Guid.NewGuid():N}.webp";
        var filePath = Path.Combine(photosDirectory, fileName);

        try
        {
            await using var sourceStream = photo.OpenReadStream();
            using var image = await Image.LoadAsync(sourceStream, cancellationToken);

            image.Mutate(ctx => ctx
                .AutoOrient()
                .Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(MaxImageDimension, MaxImageDimension)
                }));

            var encoder = new WebpEncoder
            {
                Quality = OutputWebpQuality
            };

            await image.SaveAsWebpAsync(filePath, encoder, cancellationToken);
        }
        catch (UnknownImageFormatException)
        {
            throw new InvalidOperationException("Uploaded file is not a valid image.");
        }
        catch (ImageFormatException)
        {
            throw new InvalidOperationException("Uploaded file is not a valid image.");
        }

        var baseUrl = $"{request.Scheme}://{request.Host}";
        var photoUrl = $"{baseUrl}/SeniorsPhotos/{fileName}";
        return new StoredPhotoInfo(fileName, filePath, photoUrl);
    }
}
