using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class PortalEvent
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public DateTime EventDate { get; set; }

    [MaxLength(300)]
    public string? Location { get; set; }

    [MaxLength(4000)]
    public string? Details { get; set; }

    [Required]
    public int CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CreatedByUserId))]
    public User CreatedByUser { get; set; } = null!;
}
