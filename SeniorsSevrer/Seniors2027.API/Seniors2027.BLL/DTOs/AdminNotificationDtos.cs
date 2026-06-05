namespace Seniors2027.BLL.DTOs;

public record CreateNotificationItem(
    int UserId,
    string Type,
    string Message,
    string? Link = null,
    string? ImageUrl = null
);

public class SendNotificationRequestDto
{
    public int[]? UserIds { get; set; }
    public string Type { get; set; } = "admin_message";
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
}
