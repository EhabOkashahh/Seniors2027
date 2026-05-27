namespace Seniors2027.BLL.DTOs.Challenges;

public class ChallengeMessageDto
{
    public int Id { get; set; }
    public int ChallengeId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserColor { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
