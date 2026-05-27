using System.ComponentModel.DataAnnotations;

namespace Seniors2027.BLL.DTOs.Challenges;

public class UpdateChallengeRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(2048)]
    public string? SoundUrl { get; set; }

    [Required]
    [MaxLength(50)]
    public string UploadType { get; set; } = string.Empty;

    [Required]
    public DateTime StartAtUtc { get; set; }

    [Required]
    public DateTime EndAtUtc { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;

    [Required]
    public int FirstPlacePts { get; set; }

    [Required]
    public int SecondPlacePts { get; set; }

    [Required]
    public int ThirdPlacePts { get; set; }

    public bool RemoveLogo { get; set; }
}
