using Seniors2027.BLL.DTOs.Challenges;

namespace Seniors2027.BLL.Interfaces;

public interface IChallengeService
{
    Task<ChallengeResponseDto> CreateChallengeAsync(
        CreateChallengeRequestDto dto,
        int createdByUserId,
        string? logoUrl = null,
        CancellationToken cancellationToken = default);

    Task<ChallengeResponseDto?> GetCurrentChallengeAsync(
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<ChallengeWithLeaderboardResponseDto?> GetLatestEndedChallengeAsync(
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<ChallengeResponseDto> JoinChallengeAsync(
        int challengeId,
        int currentUserId,
        JoinChallengeRequestDto dto,
        CancellationToken cancellationToken = default);

    Task<List<ChallengeSubmissionResponseDto>> GetChallengeSubmissionsAsync(
        int challengeId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task DeleteChallengeSubmissionAsync(
        int challengeId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<ChallengeSubmissionResponseDto> UploadChallengeSubmissionAsync(
        int challengeId,
        int currentUserId,
        string mediaUrl,
        string mediaType,
        CreateChallengeSubmissionRequestDto dto,
        CancellationToken cancellationToken = default);

    Task<VoteChallengeSubmissionResponseDto> VoteForSubmissionAsync(
        int challengeId,
        int submissionId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<List<ChallengeLeaderboardItemDto>> GetChallengeLeaderboardAsync(
        int challengeId,
        int currentUserId,
        CancellationToken cancellationToken = default);

    Task<List<ChallengeLeaderboardItemDto>> EndChallengeAsync(
        int challengeId,
        int adminUserId,
        CancellationToken cancellationToken = default);

    Task DeleteChallengeAsync(
        int challengeId,
        int adminUserId,
        CancellationToken cancellationToken = default);

    Task<List<ChallengeResponseDto>> GetAllChallengesAdminAsync(
        int adminUserId,
        CancellationToken cancellationToken = default);

    Task<ChallengeResponseDto> UpdateChallengeAsync(
        int challengeId,
        UpdateChallengeRequestDto dto,
        int adminUserId,
        string? logoUrl = null,
        CancellationToken cancellationToken = default);
}

