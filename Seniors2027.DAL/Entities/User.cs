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
    public Gender Gender { get; set; }

    public string? PhotoUrl { get; set; }
    [MaxLength(1000)]
    public string? Description { get; set; }
    public string Email { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Note> SentNotes { get; set; } = new List<Note>();
    public ICollection<Note> ReceivedNotes { get; set; } = new List<Note>();
    public ICollection<GalleryPhoto> GalleryPhotos { get; set; } = new List<GalleryPhoto>();
    public ICollection<DailyHighlight> DailyHighlights { get; set; } = new List<DailyHighlight>();
}
