namespace Seniors2027.BLL.DTOs;

public class DirectoryUserListItemDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public int Points { get; set; }
    public string? PhotoUrl { get; set; }
}
