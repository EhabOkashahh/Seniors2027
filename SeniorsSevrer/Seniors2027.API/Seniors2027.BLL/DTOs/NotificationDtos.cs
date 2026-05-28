namespace Seniors2027.BLL.DTOs;

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public string? ImageUrl { get; set; }
    public int? ActorId { get; set; }
    public string? ActorUsername { get; set; }
    public string? ActorPhotoUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UnreadCountDto
{
    public int Count { get; set; }
}
