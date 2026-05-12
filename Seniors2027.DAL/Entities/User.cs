using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class User
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    public Gender Gender { get; set; }

    public string? PhotoUrl { get; set; }
    [MaxLength(1000)]
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
