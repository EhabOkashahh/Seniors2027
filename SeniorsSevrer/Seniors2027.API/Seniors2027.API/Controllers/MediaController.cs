using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace Seniors2027.API.Controllers;

[ApiController]
[EnableCors("AllowReactApp")]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"
    };

    private readonly IWebHostEnvironment _environment;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider = new();

    public MediaController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [AllowAnonymous]
    [HttpGet("seniors-photo/{fileName}")]
    public ActionResult GetSeniorsPhoto([FromRoute] string fileName)
    {
        ApplyCrossOriginHeaders();

        if (string.IsNullOrWhiteSpace(fileName)) return BadRequest("Photo file is required.");

        var safeFileName = Path.GetFileName(Uri.UnescapeDataString(fileName).Trim());
        if (string.IsNullOrWhiteSpace(safeFileName)) return BadRequest("Invalid photo file.");
        if (safeFileName.Contains("..", StringComparison.Ordinal)) return BadRequest("Invalid photo file.");

        var extension = Path.GetExtension(safeFileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            return BadRequest("Unsupported photo format.");
        }

        var photosDirectory = Path.Combine(_environment.ContentRootPath, "SeniorsPhotos");
        var filePath = Path.Combine(photosDirectory, safeFileName);
        if (!System.IO.File.Exists(filePath)) return NotFound();

        if (!_contentTypeProvider.TryGetContentType(safeFileName, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
    }

    private void ApplyCrossOriginHeaders()
    {
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        Response.Headers["Vary"] = "Origin";
        Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
    }
}
