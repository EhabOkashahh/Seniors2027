using System.ComponentModel.DataAnnotations;

namespace Seniors2027.API.Models;

public class UploadSubmissionFormDto
{
    [Required]
    public string MediaUrl { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? Caption { get; set; }

    [MaxLength(200)]
    public string? TeamName { get; set; }

    public string? TeamMemberIdsCsv { get; set; }
}
