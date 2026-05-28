namespace Seniors2027.BLL.DTOs.Challenges;

public class ChallengeLeaderboardItemDto
{
    public int Rank { get; set; }
    public int SubmissionId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserPhotoUrl { get; set; }
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public int Votes { get; set; }
    public int PointsEarned { get; set; }
    public bool IsOwn { get; set; }

    // Team support
    public string? TeamName { get; set; }
    public List<TeamMemberInfoDto> TeamMembers { get; set; } = [];
    public bool IsTeamOwner { get; set; }
}
