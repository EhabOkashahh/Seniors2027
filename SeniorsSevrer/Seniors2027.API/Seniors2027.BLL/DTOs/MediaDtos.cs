namespace Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

public class GalleryPhotoDto
{
    public int Id { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
}

public class DailyHighlightUserDto
{
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Gender { get; set; }
}

public class DailyHighlightReactionUserDto
{
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}

public class DailyHighlightReactionDto
{
    public int Id { get; set; }
    public DailyHighlightReactionType Type { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsCurrentUser { get; set; }
    public DailyHighlightReactionUserDto User { get; set; } = new();
}

public class DailyHighlightMentionUserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Gender { get; set; }
}

public class DailyHighlightDto
{
    public int Id { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsOwnedByCurrentUser { get; set; }
    public DailyHighlightUserDto User { get; set; } = new();
    public List<DailyHighlightMentionUserDto> MentionedUsers { get; set; } = new();
    public List<DailyHighlightReactionDto> Reactions { get; set; } = new();
}

public enum MemoryBoardPhotoDecision
{
    Approve = 0,
    Reject = 1
}

public class ReviewMemoryBoardPhotoDto
{
    public MemoryBoardPhotoDecision Decision { get; set; }
}

public class MemoryBoardPhotoDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public MemoryBoardPhotoStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExifTakenAtUtc { get; set; }
    public DateTime SortDateUtc { get; set; }
    public bool IsOwnedByCurrentUser { get; set; }
}
