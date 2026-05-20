using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Seniors2027.API.Services;

public sealed class ImageUploadProcessor : IImageUploadProcessor
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly ImageProcessingProfile StandardProfile = new(
        MaxUploadSizeBytes: 5 * 1024 * 1024,
        MaxImageDimension: 512,
        OutputWebpQuality: 65);
    private static readonly ImageProcessingProfile DailyHighlightProfile = new(
        MaxUploadSizeBytes: 5 * 1024 * 1024,
        MaxImageDimension: 480,
        OutputWebpQuality: 60);

    private readonly IWebHostEnvironment _environment;

    public ImageUploadProcessor(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<StoredPhotoInfo> SaveProcessedPhotoAsync(
        IFormFile photo,
        HttpRequest request,
        ImageUploadPurpose purpose = ImageUploadPurpose.Standard,
        CancellationToken cancellationToken = default)
    {
        if (photo == null || photo.Length == 0)
        {
            throw new InvalidOperationException("Photo is required.");
        }

        var profile = ResolveProfile(purpose);

        var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Only jpg, jpeg, png, webp are allowed.");
        }

        if (photo.Length > profile.MaxUploadSizeBytes)
        {
            throw new InvalidOperationException("Photo size must be <= 5 MB.");
        }

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);

        var fileName = $"{Guid.NewGuid():N}.webp";
        var filePath = Path.Combine(photosDirectory, fileName);

        try
        {
            var decoderOptions = new DecoderOptions
            {
                MaxFrames = 1,
                TargetSize = new Size(profile.MaxImageDimension, profile.MaxImageDimension)
            };

            await using var sourceStream = photo.OpenReadStream();
            using var image = await Image.LoadAsync(decoderOptions, sourceStream, cancellationToken);

            image.Mutate(ctx =>
            {
                ctx.AutoOrient();

                if (image.Width <= profile.MaxImageDimension && image.Height <= profile.MaxImageDimension)
                {
                    return;
                }

                ctx.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(profile.MaxImageDimension, profile.MaxImageDimension),
                    Sampler = KnownResamplers.Triangle
                });
            });

            var encoder = new WebpEncoder
            {
                Quality = profile.OutputWebpQuality
            };

            await image.SaveAsWebpAsync(filePath, encoder, cancellationToken);
        }
        catch (ImageFormatException)
        {
            throw new InvalidOperationException("Uploaded file is not a valid image.");
        }

        var baseUrl = $"{request.Scheme}://{request.Host}";
        var photoUrl = $"{baseUrl}/SeniorsPhotos/{fileName}";
        return new StoredPhotoInfo(fileName, filePath, photoUrl);
    }

    private static ImageProcessingProfile ResolveProfile(ImageUploadPurpose purpose) =>
        purpose switch
        {
            ImageUploadPurpose.DailyHighlight => DailyHighlightProfile,
            _ => StandardProfile
        };

    private sealed record ImageProcessingProfile(long MaxUploadSizeBytes, int MaxImageDimension, int OutputWebpQuality);
}
