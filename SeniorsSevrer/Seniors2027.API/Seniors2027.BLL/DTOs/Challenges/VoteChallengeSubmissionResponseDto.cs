namespace Seniors2027.BLL.DTOs.Challenges;

public class VoteChallengeSubmissionResponseDto
{
    public bool Success { get; set; }
    public int SubmissionId { get; set; }
    public int NewVoteCount { get; set; }
    public int VotedSubmissionId { get; set; }
}
