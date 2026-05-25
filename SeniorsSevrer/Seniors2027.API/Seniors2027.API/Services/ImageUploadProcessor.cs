using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System.Globalization;

namespace Seniors2027.API.Services;

public sealed class ImageUploadProcessor : IImageUploadProcessor
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const byte DailyHighlightCaptionAlpha = 112; // ~56% transparent black
    private static readonly ImageProcessingProfile StandardProfile = new(
        MaxUploadSizeBytes: 5 * 1024 * 1024,
        MaxImageDimension: 512,
        OutputWebpQuality: 65);
    private static readonly ImageProcessingProfile DailyHighlightProfile = new(
        MaxUploadSizeBytes: 5 * 1024 * 1024,
        MaxImageDimension: 1440,
        OutputWebpQuality: 86);
    private static readonly ImageProcessingProfile MemoryBoardProfile = new(
        MaxUploadSizeBytes: 5 * 1024 * 1024,
        MaxImageDimension: 1600,
        OutputWebpQuality: 88);

    private readonly IWebHostEnvironment _environment;

    public ImageUploadProcessor(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<StoredPhotoInfo> SaveProcessedPhotoAsync(
        IFormFile photo,
        HttpRequest request,
        ImageUploadPurpose purpose = ImageUploadPurpose.Standard,
        CancellationToken cancellationToken = default,
        ImageCaptionOverlayRequest? captionOverlay = null)
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
            var sizeLimitMb = Math.Max(1, profile.MaxUploadSizeBytes / (1024 * 1024));
            throw new InvalidOperationException($"Photo size must be <= {sizeLimitMb} MB.");
        }

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        Directory.CreateDirectory(photosDirectory);

        var fileName = $"{Guid.NewGuid():N}.webp";
        var filePath = Path.Combine(photosDirectory, fileName);
        DateTime? exifTakenAtUtc = null;

        try
        {
            var decoderOptions = new DecoderOptions
            {
                MaxFrames = 1,
                TargetSize = new Size(profile.MaxImageDimension, profile.MaxImageDimension)
            };

            await using var sourceStream = photo.OpenReadStream();
            using var image = await Image.LoadAsync<Rgba32>(decoderOptions, sourceStream, cancellationToken);
            exifTakenAtUtc = TryExtractExifDateTakenUtc(image.Metadata.ExifProfile);

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

            if (purpose == ImageUploadPurpose.DailyHighlight && captionOverlay is not null)
            {
                ApplyDailyHighlightCaptionOverlay(image, captionOverlay);
            }

            var encoder = new WebpEncoder
            {
                Quality = profile.OutputWebpQuality
            };

            using var flattenedImage = FlattenToOpaqueRgb(image);
            await flattenedImage.SaveAsWebpAsync(filePath, encoder, cancellationToken);
        }
        catch (ImageFormatException)
        {
            throw new InvalidOperationException("Uploaded file is not a valid image.");
        }

        var baseUrl = $"{request.Scheme}://{request.Host}";
        var photoUrl = $"{baseUrl}/SeniorsPhotos/{fileName}";
        return new StoredPhotoInfo(fileName, filePath, photoUrl, exifTakenAtUtc);
    }

    private static void ApplyDailyHighlightCaptionOverlay(Image<Rgba32> image, ImageCaptionOverlayRequest captionOverlay)
    {
        var captionText = captionOverlay.CaptionText.Trim();
        if (string.IsNullOrWhiteSpace(captionText))
        {
            return;
        }

        var isArabicText = ContainsArabicCharacters(captionText);
        var fontSize = Math.Max(20f, MathF.Min(56f, image.Width * 0.058f));
        var font = ResolveCaptionFont(fontSize, isArabicText);
        var fallbackFamilies = ResolveCaptionFallbackFamilies(isArabicText, font.Family);

        var textOptions = new RichTextOptions(font)
        {
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Top,
            WrappingLength = Math.Max(120, image.Width - 56),
            LineSpacing = 1.04f,
            Origin = PointF.Empty,
            TextDirection = isArabicText ? TextDirection.RightToLeft : TextDirection.Auto,
            WordBreaking = WordBreaking.BreakWord,
            FallbackFontFamilies = fallbackFamilies
        };

        var measuredText = TextMeasurer.MeasureSize(captionText, textOptions);
        var barPaddingY = MathF.Max(12f, image.Height * 0.018f);
        var barHeight = MathF.Min(image.Height * 0.36f, MathF.Max(52f, measuredText.Height + (barPaddingY * 2f)));

        var maxTop = MathF.Max(0f, image.Height - barHeight);
        var normalizedY = Math.Clamp((float)captionOverlay.VerticalPositionPercent, 0f, 1f);
        var barTop = Math.Clamp(normalizedY * image.Height, 0f, maxTop);
        var textOriginY = barTop + MathF.Max(0f, (barHeight - measuredText.Height) / 2f);

        image.Mutate(ctx =>
        {
            ctx.Fill(new Rgba32(0, 0, 0, DailyHighlightCaptionAlpha), new RectangleF(0f, barTop, image.Width, barHeight));
            ctx.DrawText(new RichTextOptions(textOptions) { Origin = new PointF(image.Width / 2f, textOriginY) }, captionText, Color.White);
        });
    }

    private static Image<Rgb24> FlattenToOpaqueRgb(Image<Rgba32> source)
    {
        var output = new Image<Rgb24>(source.Width, source.Height, new Rgb24(255, 255, 255));
        output.Mutate(ctx => ctx.DrawImage(source, 1f));
        return output;
    }

    private static Font ResolveCaptionFont(float fontSize, bool prefersArabic)
    {
        var preferredFamilies = prefersArabic
            ? new[] { "Segoe UI", "Tahoma", "Arial", "Noto Naskh Arabic", "Noto Sans Arabic" }
            : new[] { "Arial Black", "Segoe UI Black", "Arial", "Segoe UI", "Tahoma" };

        foreach (var familyName in preferredFamilies)
        {
            if (SystemFonts.TryGet(familyName, out var family))
            {
                return family.CreateFont(fontSize, FontStyle.Bold);
            }
        }

        foreach (var fallbackFamily in SystemFonts.Collection.Families)
        {
            return fallbackFamily.CreateFont(fontSize, FontStyle.Bold);
        }

        throw new InvalidOperationException("No system font is available for caption rendering.");
    }

    private static IReadOnlyList<FontFamily> ResolveCaptionFallbackFamilies(bool prefersArabic, FontFamily baseFamily)
    {
        var fallbackFamilyNames = prefersArabic
            ? new[] { "Segoe UI", "Tahoma", "Arial", "Noto Naskh Arabic", "Noto Sans Arabic", "Arial Unicode MS" }
            : new[] { "Segoe UI", "Arial", "Tahoma", "Noto Sans Arabic", "Noto Naskh Arabic" };

        var families = new List<FontFamily>();
        foreach (var familyName in fallbackFamilyNames)
        {
            if (!SystemFonts.TryGet(familyName, out var family)) continue;
            if (family.Name.Equals(baseFamily.Name, StringComparison.OrdinalIgnoreCase)) continue;
            if (families.Any(existing => existing.Name.Equals(family.Name, StringComparison.OrdinalIgnoreCase))) continue;
            families.Add(family);
        }

        return families;
    }

    private static bool ContainsArabicCharacters(string value)
    {
        foreach (var ch in value)
        {
            if (ch is >= '\u0600' and <= '\u06FF') return true;
            if (ch is >= '\u0750' and <= '\u077F') return true;
            if (ch is >= '\u08A0' and <= '\u08FF') return true;
            if (ch is >= '\uFB50' and <= '\uFDFF') return true;
            if (ch is >= '\uFE70' and <= '\uFEFF') return true;
        }

        return false;
    }

    private static ImageProcessingProfile ResolveProfile(ImageUploadPurpose purpose) =>
        purpose switch
        {
            ImageUploadPurpose.DailyHighlight => DailyHighlightProfile,
            ImageUploadPurpose.MemoryBoard => MemoryBoardProfile,
            _ => StandardProfile
        };

    private static DateTime? TryExtractExifDateTakenUtc(ExifProfile? exifProfile)
    {
        if (exifProfile == null)
        {
            return null;
        }

        var date = ParseExifDateTime(TryGetExifValue(exifProfile, ExifTag.DateTimeOriginal))
            ?? ParseExifDateTime(TryGetExifValue(exifProfile, ExifTag.DateTimeDigitized))
            ?? ParseExifDateTime(TryGetExifValue(exifProfile, ExifTag.DateTime));

        if (date == null)
        {
            return null;
        }

        var normalized = DateTime.SpecifyKind(date.Value, DateTimeKind.Utc);
        return normalized;
    }

    private static DateTime? ParseExifDateTime(object? rawValue)
    {
        if (rawValue == null)
        {
            return null;
        }

        if (rawValue is DateTime directDateTime)
        {
            return directDateTime;
        }

        var text = rawValue.ToString();
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (DateTime.TryParseExact(
                text.Trim(),
                "yyyy:MM:dd HH:mm:ss",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var parsed))
        {
            return parsed;
        }

        if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out parsed))
        {
            return parsed;
        }

        return null;
    }

    private static object? TryGetExifValue<TValue>(ExifProfile exifProfile, ExifTag<TValue> tag)
    {
        if (!exifProfile.TryGetValue(tag, out IExifValue<TValue>? value))
        {
            return null;
        }

        return value.Value;
    }

    private sealed record ImageProcessingProfile(long MaxUploadSizeBytes, int MaxImageDimension, int OutputWebpQuality);
}
