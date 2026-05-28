using System.ComponentModel.DataAnnotations;

namespace Seniors2027.API.Models;

public class UploadSubmissionFormDto
{
    [Required]
    public IFormFile Media { get; set; } = null!;

    [MaxLength(120)]
    public string? Caption { get; set; }

    [MaxLength(200)]
    public string? TeamName { get; set; }

    public string? TeamMemberIdsCsv { get; set; }
}
