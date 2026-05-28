namespace Seniors2027.BLL.DTOs.Challenges;

public class ChallengeResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? SoundUrl { get; set; }
    public string UploadType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime DeadlineUtc { get; set; }
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public int FirstPlacePts { get; set; }
    public int SecondPlacePts { get; set; }
    public int ThirdPlacePts { get; set; }

    public int MinParticipants { get; set; }
    public int MinSubmissions { get; set; }

    public int? CurrentUserRoleId { get; set; }
    public string? CurrentUserRole { get; set; }
    public int? CurrentUserSubmissionId { get; set; }
    public string? CurrentUserSubmissionMediaUrl { get; set; }
    public string? CurrentUserSubmissionMediaType { get; set; }
    public int? CurrentUserVotedSubmissionId { get; set; }

    public bool HasCurrentUserJoined { get; set; }
    public bool HasCurrentUserSubmitted { get; set; }
    public bool HasCurrentUserVoted { get; set; }

    public List<ChallengeParticipantDto> Participants { get; set; } = [];
}
