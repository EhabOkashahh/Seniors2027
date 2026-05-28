using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class ChallengeTeamMember
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TeamId { get; set; }

    [Required]
    public int UserId { get; set; }

    // Navigation
    public ChallengeTeam Team { get; set; } = null!;
    public User User { get; set; } = null!;
}
