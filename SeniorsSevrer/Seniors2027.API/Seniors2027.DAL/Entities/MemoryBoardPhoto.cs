using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class MemoryBoardPhoto
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(2048)]
    public string PhotoUrl { get; set; } = string.Empty;

    [Required]
    public MemoryBoardPhotoStatus Status { get; set; } = MemoryBoardPhotoStatus.Pending;

    public DateTime? ExifTakenAtUtc { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAtUtc { get; set; }

    public int? ReviewedByUserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ReviewedByUserId))]
    public User? ReviewedByUser { get; set; }
}
