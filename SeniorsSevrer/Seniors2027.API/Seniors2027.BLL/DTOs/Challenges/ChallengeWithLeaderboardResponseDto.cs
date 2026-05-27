namespace Seniors2027.BLL.DTOs.Challenges;

public class ChallengeWithLeaderboardResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string UploadType { get; set; } = string.Empty;
    public int FirstPlacePts { get; set; }
    public int SecondPlacePts { get; set; }
    public int ThirdPlacePts { get; set; }
    public List<ChallengeLeaderboardItemDto> Winners { get; set; } = [];
}
