using Seniors2027.BLL.Interfaces;

namespace Seniors2027.API.Services;

public sealed class FileService : IFileService
{
    private readonly string _challengeMediaDirectory;

    public FileService(IWebHostEnvironment environment)
    {
        _challengeMediaDirectory = Path.Combine(environment.ContentRootPath, "ChallengeMedia");
        try
        {
            Directory.CreateDirectory(_challengeMediaDirectory);
        }
        catch
        {
            // Directory creation failure is non-fatal — will be retried on first I/O.
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
}
