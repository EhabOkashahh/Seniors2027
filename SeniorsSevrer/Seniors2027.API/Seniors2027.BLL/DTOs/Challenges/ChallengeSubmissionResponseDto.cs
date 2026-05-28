namespace Seniors2027.BLL.DTOs.Challenges;

public class ChallengeSubmissionResponseDto
{
    public int Id { get; set; }
    public int ChallengeId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserPhotoUrl { get; set; }
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public int Votes { get; set; }
    public bool IsOwn { get; set; }
    public bool IsVotedByCurrentUser { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    // Team support
    public string? TeamName { get; set; }
    public List<TeamMemberInfoDto> TeamMembers { get; set; } = [];
    public bool IsTeamOwner { get; set; }
}
