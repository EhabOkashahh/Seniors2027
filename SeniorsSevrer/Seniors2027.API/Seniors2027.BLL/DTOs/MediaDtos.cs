namespace Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

public class GalleryPhotoDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class DailyHighlightUserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}

public class DailyHighlightDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int GalleryPhotoId { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DailyHighlightUserDto User { get; set; } = new();
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
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public MemoryBoardPhotoStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExifTakenAtUtc { get; set; }
    public DateTime SortDateUtc { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public int? ReviewedByUserId { get; set; }
    public string? ReviewedByUsername { get; set; }
}
