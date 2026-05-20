using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.DTOs;

public class AdminUserListItemDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public Gender Gender { get; set; }
    public UserRole Role { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminSetUserLockDto
{
    public bool IsLocked { get; set; }
}
