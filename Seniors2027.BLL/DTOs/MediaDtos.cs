namespace Seniors2027.BLL.DTOs;

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
