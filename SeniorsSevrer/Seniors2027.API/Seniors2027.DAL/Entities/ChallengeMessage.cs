using System.ComponentModel.DataAnnotations;
using Seniors2027.DAL.Entities;

namespace Seniors2027.DAL.Entities;

public class ChallengeMessage
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChallengeId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Text { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public virtual Challenge Challenge { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
