using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Seniors2027.API.Services;

public static class LegacyPhotoNormalizer
{
    private static readonly string[] LegacyExtensions = [".jpg", ".jpeg", ".png"];

    public static async Task NormalizeToWebpAsync(string photosDirectory, CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(photosDirectory))
        {
            return;
        }

        var files = Directory.EnumerateFiles(photosDirectory)
            .Where(path => LegacyExtensions.Contains(Path.GetExtension(path).ToLowerInvariant()))
            .ToArray();

        await Parallel.ForEachAsync(files, new ParallelOptions { MaxDegreeOfParallelism = 4, CancellationToken = cancellationToken },
            async (legacyPath, ct) =>
            {
                var webpPath = Path.ChangeExtension(legacyPath, ".webp");
                if (File.Exists(webpPath))
                {
                    webpPath = Path.Combine(
                        photosDirectory,
                        $"{Path.GetFileNameWithoutExtension(legacyPath)}-{Guid.NewGuid():N}.webp");
                }

                try
                {
                    using var image = await Image.LoadAsync(legacyPath, ct);
                    image.Mutate(ctx => ctx.AutoOrient());
                    await image.SaveAsWebpAsync(webpPath, new WebpEncoder { Quality = 65 }, ct);
                    File.Delete(legacyPath);
                }
                catch
                {
                    // Keep original file if conversion fails.
                }
            });
    }
}
