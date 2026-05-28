using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class Notification
{
    [Key]
    public int Id { get; set; }

    public int UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Link { get; set; }

    [MaxLength(2048)]
    public string? ImageUrl { get; set; }

    public int? ActorId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public User? Actor { get; set; }
}
