using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class DailyHighlightMention
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DailyHighlightId { get; set; }

    [Required]
    public int MentionedUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(DailyHighlightId))]
    public DailyHighlight DailyHighlight { get; set; } = null!;

    [ForeignKey(nameof(MentionedUserId))]
    public User MentionedUser { get; set; } = null!;
}
