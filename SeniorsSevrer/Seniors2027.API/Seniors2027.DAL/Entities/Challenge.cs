using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class Challenge
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(2048)]
    public string? LogoUrl { get; set; }

    [MaxLength(2048)]
    public string? SoundUrl { get; set; }

    [Required]
    [MaxLength(50)]
    public string UploadType { get; set; } = "Video";

    [Required]
    public DateTime DeadlineUtc { get; set; }

    [Required]
    public DateTime StartAtUtc { get; set; }

    [Required]
    public DateTime EndAtUtc { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Hidden";

    [Required]
    public int FirstPlacePts { get; set; } = 100;

    [Required]
    public int SecondPlacePts { get; set; } = 50;

    [Required]
    public int ThirdPlacePts { get; set; } = 25;

    [Required]
    public int MinParticipants { get; set; } = 6;

    [Required]
    public int MinSubmissions { get; set; } = 4;

    [Required]
    public int CreatedByUserId { get; set; }

    [Required]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User CreatedByUser { get; set; } = null!;
    public ICollection<ChallengeParticipant> Participants { get; set; } = new List<ChallengeParticipant>();
    public ICollection<ChallengeSubmission> Submissions { get; set; } = new List<ChallengeSubmission>();
    public ICollection<ChallengeVote> Votes { get; set; } = new List<ChallengeVote>();
    public ICollection<ChallengeMessage> Messages { get; set; } = new List<ChallengeMessage>();
    public ICollection<ChallengeTeam> Teams { get; set; } = new List<ChallengeTeam>();
}
