using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class NoteReaction
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int NoteId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public NoteReactionType Type { get; set; } = NoteReactionType.Love;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(NoteId))]
    public Note Note { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
