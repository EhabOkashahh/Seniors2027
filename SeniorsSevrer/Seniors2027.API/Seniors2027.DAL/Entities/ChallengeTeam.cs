using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class ChallengeTeam
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChallengeId { get; set; }

    public int? SubmissionId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation
    public Challenge Challenge { get; set; } = null!;
    public ChallengeSubmission? Submission { get; set; }
    public ICollection<ChallengeTeamMember> Members { get; set; } = new List<ChallengeTeamMember>();
}
