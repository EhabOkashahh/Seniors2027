using System.ComponentModel.DataAnnotations;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.DTOs;

public class CreateNoteDto
{
    [Required]
    public int RecipientId { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;
}

public class NoteSenderDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}

public class NoteDto
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public NoteSenderDto Sender { get; set; } = new();
    public List<NoteReactionDto> Reactions { get; set; } = [];
}

public class NoteReactionUserDto
{
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}

public class NoteReactionDto
{
    public int Id { get; set; }
    public NoteReactionType Type { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsCurrentUser { get; set; }
    public NoteReactionUserDto User { get; set; } = new();
}

public class ToggleNoteReactionDto
{
    public NoteReactionType Type { get; set; }
}

public class PagedNotesResponseDto
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public List<NoteDto> Items { get; set; } = [];
}
