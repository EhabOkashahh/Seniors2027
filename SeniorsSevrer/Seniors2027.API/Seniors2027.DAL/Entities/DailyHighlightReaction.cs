using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class DailyHighlightReaction
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DailyHighlightId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public DailyHighlightReactionType Type { get; set; } = DailyHighlightReactionType.Love;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(DailyHighlightId))]
    public DailyHighlight DailyHighlight { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
