namespace Seniors2027.DAL.Entities;

public class UserOtp
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiryTime { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
}
