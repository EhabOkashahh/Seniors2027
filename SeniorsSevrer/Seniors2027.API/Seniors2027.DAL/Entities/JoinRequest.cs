using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class JoinRequest
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public JoinRequestStatus Status { get; set; } = JoinRequestStatus.Pending;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }

    public int? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }

    public int? ApprovedUserId { get; set; }
    public User? ApprovedUser { get; set; }
}
