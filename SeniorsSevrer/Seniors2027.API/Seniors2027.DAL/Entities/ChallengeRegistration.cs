using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class ChallengeRegistration
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChallengeId { get; set; }
    public Challenge Challenge { get; set; } = null!;

    [Required]
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
}
