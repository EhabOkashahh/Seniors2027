using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Seniors2027.DAL.Entities;

public class Note
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;

    [Required]
    public int SenderId { get; set; }

    [Required]
    public int RecipientId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(SenderId))]
    public User Sender { get; set; } = null!;

    [ForeignKey(nameof(RecipientId))]
    public User Recipient { get; set; } = null!;

    public ICollection<NoteReaction> Reactions { get; set; } = new List<NoteReaction>();
}
