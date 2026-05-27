using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class ChallengeVote
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChallengeId { get; set; }

    [Required]
    public int SubmissionId { get; set; }

    [Required]
    public int VoterUserId { get; set; }

    [Required]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Challenge Challenge { get; set; } = null!;
    public ChallengeSubmission Submission { get; set; } = null!;
    public User VoterUser { get; set; } = null!;
}
