using System.ComponentModel.DataAnnotations;

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
}

public class PagedNotesResponseDto
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public List<NoteDto> Items { get; set; } = [];
}
