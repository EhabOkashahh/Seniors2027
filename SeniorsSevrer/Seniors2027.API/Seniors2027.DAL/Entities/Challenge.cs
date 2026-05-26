using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class Challenge
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = "tiktok";

    [Required]
    [MaxLength(20)]
    public string Mode { get; set; } = string.Empty;

    [Required]
    public string TitleSvgDataUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    public DateTime? StartDateUtc { get; set; }
    public DateTime? EndDateUtc { get; set; }

    [Required]
    public string RedirectActionJson { get; set; } = "[]";

    [Required]
    public string AttachmentButtonsJson { get; set; } = "[]";

    public string? QuizActionJson { get; set; }

    [Required]
    public bool IsBroadcasted { get; set; } = false;

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
