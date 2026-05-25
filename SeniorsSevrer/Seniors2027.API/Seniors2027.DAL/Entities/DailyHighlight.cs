using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class DailyHighlight
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int GalleryPhotoId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(GalleryPhotoId))]
    public GalleryPhoto GalleryPhoto { get; set; } = null!;

    public ICollection<DailyHighlightReaction> Reactions { get; set; } = new List<DailyHighlightReaction>();
    public ICollection<DailyHighlightMention> Mentions { get; set; } = new List<DailyHighlightMention>();
}
