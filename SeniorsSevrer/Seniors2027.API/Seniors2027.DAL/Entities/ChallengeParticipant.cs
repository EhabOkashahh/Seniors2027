using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class ChallengeParticipant
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChallengeId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = "Spectator";

    [Required]
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Challenge Challenge { get; set; } = null!;
    public User User { get; set; } = null!;
}
