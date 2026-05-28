using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class ChallengeSubmission
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChallengeId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(2048)]
    public string MediaUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string MediaType { get; set; } = "Video";

    [MaxLength(120)]
    public string? Caption { get; set; }

    [Required]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Challenge Challenge { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<ChallengeVote> Votes { get; set; } = new List<ChallengeVote>();

    // Team support
    public int? TeamId { get; set; }
    public ChallengeTeam? Team { get; set; }
}
