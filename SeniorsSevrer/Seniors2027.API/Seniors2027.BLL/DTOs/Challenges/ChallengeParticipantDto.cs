namespace Seniors2027.BLL.DTOs.Challenges;

public class ChallengeParticipantDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string Role { get; set; } = string.Empty;
}
