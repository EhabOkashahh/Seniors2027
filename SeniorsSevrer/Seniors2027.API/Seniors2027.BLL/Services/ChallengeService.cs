using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs.Challenges;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class ChallengeService : IChallengeService
{
    private readonly AppDbContext _context;

    public ChallengeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ChallengeResponseDto> CreateChallengeAsync(
        CreateChallengeRequestDto dto,
        int createdByUserId,
        string? logoUrl = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Title is required.");

        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Description is required.");

        if (dto.UploadType != "Video" && dto.UploadType != "Image" && dto.UploadType != "Audio")
            throw new InvalidOperationException("UploadType must be 'Video', 'Image' or 'Audio'.");

        if (dto.Status != "Hidden" && dto.Status != "BeforeStart" && dto.Status != "Active" && dto.Status != "Ended")
            throw new InvalidOperationException("Invalid status.");

        if (dto.FirstPlacePts <= dto.SecondPlacePts || dto.SecondPlacePts <= dto.ThirdPlacePts)
            throw new InvalidOperationException("Points must be: First > Second > Third.");

        if (dto.FirstPlacePts <= 0 || dto.SecondPlacePts <= 0 || dto.ThirdPlacePts <= 0)
            throw new InvalidOperationException("Points must be greater than zero.");

        if (dto.EndAtUtc <= dto.StartAtUtc)
            throw new InvalidOperationException("End date must be after start date.");

        if (dto.Status == "Active")
        {
            var hasActive = await _context.Challenges.AnyAsync(c => c.Status == "Active", cancellationToken);
            if (hasActive)
                throw new InvalidOperationException("An active challenge already exists.");
        }

        if (dto.Status == "BeforeStart")
        {
            if (dto.StartAtUtc < DateTime.UtcNow.AddMinutes(-5))
                throw new InvalidOperationException("Start date for 'BeforeStart' challenge cannot be in the past.");
        }

        var challenge = new Challenge
        {
            Title = dto.Title,
            Description = dto.Description,
            LogoUrl = logoUrl,
            SoundUrl = dto.SoundUrl,
            UploadType = dto.UploadType,
            DeadlineUtc = dto.EndAtUtc,
            StartAtUtc = dto.StartAtUtc,
            EndAtUtc = dto.EndAtUtc,
            Status = dto.Status,
            FirstPlacePts = dto.FirstPlacePts,
            SecondPlacePts = dto.SecondPlacePts,
            ThirdPlacePts = dto.ThirdPlacePts,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _context.Challenges.Add(challenge);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToChallengeResponseDto(challenge, createdByUserId);
    }

    public async Task<ChallengeResponseDto?> GetCurrentChallengeAsync(
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Participants.Where(p => p.UserId == currentUserId))
            .Include(c => c.Submissions.Where(s => s.UserId == currentUserId))
            .Include(c => c.Votes.Where(v => v.VoterUserId == currentUserId))
            .Where(c => c.Status != "Hidden")
            .OrderByDescending(c => c.Status == "Active" ? 3 : c.Status == "BeforeStart" ? 2 : 1)
            .ThenByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (challenge == null)
            return null;

        return MapToChallengeResponseDto(challenge, currentUserId);
    }

    public async Task<ChallengeResponseDto> JoinChallengeAsync(
        int challengeId,
        int currentUserId,
        JoinChallengeRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Participants.Where(p => p.UserId == currentUserId))
            .Include(c => c.Submissions.Where(s => s.UserId == currentUserId))
            .Include(c => c.Votes.Where(v => v.VoterUserId == currentUserId))
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status == "Hidden" || challenge.Status == "Ended")
            throw new InvalidOperationException($"Cannot join a challenge that is {challenge.Status}.");

        if (dto.Role != "Challenger" && dto.Role != "Spectator")
            throw new InvalidOperationException("Role must be 'Challenger' or 'Spectator'.");

        var participant = challenge.Participants.FirstOrDefault(p => p.UserId == currentUserId);

        if (participant != null)
        {
            if (challenge.Status == "Active")
                throw new InvalidOperationException("You already joined this challenge and cannot switch roles while it is Active.");
            
            // Allow role switch in BeforeStart
            if (participant.Role != dto.Role)
            {
                participant.Role = dto.Role;
            }
        }
        else
        {
            participant = new ChallengeParticipant
            {
                ChallengeId = challengeId,
                UserId = currentUserId,
                Role = dto.Role,
                JoinedAtUtc = DateTime.UtcNow
            };
            _context.ChallengeParticipants.Add(participant);
            challenge.Participants.Add(participant);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return MapToChallengeResponseDto(challenge, currentUserId);
    }

    public async Task<List<ChallengeSubmissionResponseDto>> GetChallengeSubmissionsAsync(
        int challengeId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status == "Hidden")
            throw new InvalidOperationException("Challenge is hidden.");

        var submissions = await _context.ChallengeSubmissions
            .AsNoTracking()
            .Where(s => s.ChallengeId == challengeId)
            .OrderByDescending(s => s.CreatedAtUtc)
            .Select(s => new ChallengeSubmissionResponseDto
            {
                Id = s.Id,
                ChallengeId = s.ChallengeId,
                UserId = s.UserId,
                UserName = s.User.Username,
                UserPhotoUrl = s.User.PhotoUrl,
                MediaUrl = s.MediaUrl,
                MediaType = s.MediaType,
                Caption = s.Caption,
                Votes = s.Votes.Count,
                IsOwn = s.UserId == currentUserId,
                IsVotedByCurrentUser = s.Votes.Any(v => v.VoterUserId == currentUserId),
                CreatedAtUtc = s.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return submissions;
    }

    public async Task<ChallengeSubmissionResponseDto> UploadChallengeSubmissionAsync(
        int challengeId,
        int currentUserId,
        string mediaUrl,
        string mediaType,
        CreateChallengeSubmissionRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Participants.Where(p => p.UserId == currentUserId))
            .Include(c => c.Submissions.Where(s => s.UserId == currentUserId))
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status != "Active")
            throw new InvalidOperationException($"Cannot upload to a challenge that is {challenge.Status}.");

        var participant = challenge.Participants.FirstOrDefault();
        if (participant == null)
            throw new InvalidOperationException("You must join the challenge before uploading.");

        if (participant.Role != "Challenger")
            throw new InvalidOperationException("Only Challengers can upload submissions. Spectators are just here to judge.");

        if (challenge.Submissions.Any())
            throw new InvalidOperationException("You already uploaded a submission for this challenge.");

        if (dto.Caption?.Length > 120)
            throw new InvalidOperationException("Caption cannot exceed 120 characters.");

        var submission = new ChallengeSubmission
        {
            ChallengeId = challengeId,
            UserId = currentUserId,
            MediaUrl = mediaUrl,
            MediaType = mediaType,
            Caption = dto.Caption,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ChallengeSubmissions.Add(submission);
        await _context.SaveChangesAsync(cancellationToken);

        // Fetch user info for the response
        var user = await _context.Users.AsNoTracking().FirstAsync(u => u.Id == currentUserId, cancellationToken);

        return new ChallengeSubmissionResponseDto
        {
            Id = submission.Id,
            ChallengeId = submission.ChallengeId,
            UserId = submission.UserId,
            UserName = user.Username,
            UserPhotoUrl = user.PhotoUrl,
            MediaUrl = submission.MediaUrl,
            MediaType = submission.MediaType,
            Caption = submission.Caption,
            Votes = 0,
            IsOwn = true,
            IsVotedByCurrentUser = false,
            CreatedAtUtc = submission.CreatedAtUtc
        };
    }

    public async Task<VoteChallengeSubmissionResponseDto> VoteForSubmissionAsync(
        int challengeId,
        int submissionId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Participants.Where(p => p.UserId == currentUserId))
            .Include(c => c.Votes.Where(v => v.VoterUserId == currentUserId))
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status != "Active")
            throw new InvalidOperationException($"Cannot vote in a challenge that is {challenge.Status}.");

        if (!challenge.Participants.Any())
            throw new InvalidOperationException("You must join the challenge before voting.");

        if (challenge.Votes.Any())
            throw new InvalidOperationException("You already voted in this challenge.");

        var submission = await _context.ChallengeSubmissions
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.ChallengeId == challengeId, cancellationToken);

        if (submission == null)
            throw new InvalidOperationException("Submission not found in this challenge.");

        if (submission.UserId == currentUserId)
            throw new InvalidOperationException("You cannot vote for your own submission.");

        var vote = new ChallengeVote
        {
            ChallengeId = challengeId,
            SubmissionId = submissionId,
            VoterUserId = currentUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ChallengeVotes.Add(vote);
        await _context.SaveChangesAsync(cancellationToken);

        var newVoteCount = await _context.ChallengeVotes.CountAsync(v => v.SubmissionId == submissionId, cancellationToken);

        return new VoteChallengeSubmissionResponseDto
        {
            Success = true,
            SubmissionId = submissionId,
            NewVoteCount = newVoteCount,
            VotedSubmissionId = submissionId
        };
    }

    public async Task<List<ChallengeLeaderboardItemDto>> GetChallengeLeaderboardAsync(
        int challengeId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status == "Hidden")
            throw new InvalidOperationException("Challenge is hidden.");

        if (challenge.Status == "BeforeStart")
            return new List<ChallengeLeaderboardItemDto>();

        return await GetLeaderboardInternalAsync(challenge, currentUserId, cancellationToken);
    }

    public async Task<List<ChallengeLeaderboardItemDto>> EndChallengeAsync(
        int challengeId,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status == "Hidden")
            throw new InvalidOperationException("Cannot end a hidden challenge.");

        if (challenge.Status == "Ended")
            throw new InvalidOperationException("Challenge is already ended.");

        if (challenge.Status == "BeforeStart")
            throw new InvalidOperationException("Cannot end a challenge that has not started.");

        // Get winners to award points
        var winners = await GetLeaderboardInternalAsync(challenge, adminUserId, cancellationToken);

        foreach (var winner in winners)
        {
            var user = await _context.Users.FindAsync([winner.UserId], cancellationToken);
            if (user != null)
            {
                user.Points += winner.PointsEarned;
            }
        }

        challenge.Status = "Ended";
        challenge.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return winners;
    }

    public async Task DeleteChallengeAsync(
        int challengeId,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Votes)
            .Include(c => c.Submissions)
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        // We delete in order just to be safe with the Restrict constraints
        if (challenge.Votes.Any())
        {
            _context.ChallengeVotes.RemoveRange(challenge.Votes);
        }

        if (challenge.Submissions.Any())
        {
            _context.ChallengeSubmissions.RemoveRange(challenge.Submissions);
        }

        if (challenge.Participants.Any())
        {
            _context.ChallengeParticipants.RemoveRange(challenge.Participants);
        }

        _context.Challenges.Remove(challenge);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<ChallengeResponseDto>> GetAllChallengesAdminAsync(
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        var challenges = await _context.Challenges
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return challenges.Select(c => MapToChallengeResponseDto(c, adminUserId)).ToList();
    }

    public async Task<ChallengeResponseDto> UpdateChallengeAsync(
        int challengeId,
        UpdateChallengeRequestDto dto,
        int adminUserId,
        string? logoUrl = null,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Title is required.");

        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Description is required.");

        if (dto.UploadType != "Video" && dto.UploadType != "Image" && dto.UploadType != "Audio")
            throw new InvalidOperationException("UploadType must be 'Video', 'Image' or 'Audio'.");

        if (dto.Status != "Hidden" && dto.Status != "BeforeStart" && dto.Status != "Active" && dto.Status != "Ended")
            throw new InvalidOperationException("Invalid status.");

        if (dto.FirstPlacePts <= dto.SecondPlacePts || dto.SecondPlacePts <= dto.ThirdPlacePts)
            throw new InvalidOperationException("Points must be: First > Second > Third.");

        if (dto.FirstPlacePts <= 0 || dto.SecondPlacePts <= 0 || dto.ThirdPlacePts <= 0)
            throw new InvalidOperationException("Points must be greater than zero.");

        if (dto.EndAtUtc <= dto.StartAtUtc)
            throw new InvalidOperationException("End date must be after start date.");

        if (dto.Status == "Active" && challenge.Status != "Active")
        {
            var hasActive = await _context.Challenges.AnyAsync(c => c.Status == "Active" && c.Id != challengeId, cancellationToken);
            if (hasActive)
                throw new InvalidOperationException("Another active challenge already exists.");
        }

        challenge.Title = dto.Title;
        challenge.Description = dto.Description;
        challenge.SoundUrl = dto.SoundUrl;
        challenge.UploadType = dto.UploadType;
        challenge.StartAtUtc = dto.StartAtUtc;
        challenge.EndAtUtc = dto.EndAtUtc;
        challenge.DeadlineUtc = dto.EndAtUtc; // Keep consistent with legacy field
        challenge.Status = dto.Status;
        challenge.FirstPlacePts = dto.FirstPlacePts;
        challenge.SecondPlacePts = dto.SecondPlacePts;
        challenge.ThirdPlacePts = dto.ThirdPlacePts;
        challenge.UpdatedAtUtc = DateTime.UtcNow;

        if (logoUrl != null)
        {
            challenge.LogoUrl = logoUrl;
        }
        else if (dto.RemoveLogo)
        {
            challenge.LogoUrl = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return MapToChallengeResponseDto(challenge, adminUserId);
    }

    private async Task<List<ChallengeLeaderboardItemDto>> GetLeaderboardInternalAsync(
        Challenge challenge, 
        int currentUserId, 
        CancellationToken cancellationToken)
    {
        var topSubmissions = await _context.ChallengeSubmissions
            .AsNoTracking()
            .Where(s => s.ChallengeId == challenge.Id)
            .Select(s => new
            {
                s.Id,
                s.UserId,
                s.User.Username,
                s.User.PhotoUrl,
                s.MediaUrl,
                s.MediaType,
                s.Caption,
                s.CreatedAtUtc,
                VoteCount = s.Votes.Count
            })
            .OrderByDescending(s => s.VoteCount)
            .ThenBy(s => s.CreatedAtUtc)
            .Take(3)
            .ToListAsync(cancellationToken);

        return topSubmissions.Select((s, index) => new ChallengeLeaderboardItemDto
        {
            Rank = index + 1,
            SubmissionId = s.Id,
            UserId = s.UserId,
            UserName = s.Username,
            UserPhotoUrl = s.PhotoUrl,
            MediaUrl = s.MediaUrl,
            MediaType = s.MediaType,
            Caption = s.Caption,
            Votes = s.VoteCount,
            IsOwn = s.UserId == currentUserId,
            PointsEarned = index == 0 ? challenge.FirstPlacePts :
                           index == 1 ? challenge.SecondPlacePts :
                           challenge.ThirdPlacePts
        }).ToList();
    }

    private ChallengeResponseDto MapToChallengeResponseDto(Challenge challenge, int currentUserId)
    {
        var participant = challenge.Participants?.FirstOrDefault(p => p.UserId == currentUserId);
        var submission = challenge.Submissions?.FirstOrDefault(s => s.UserId == currentUserId);
        var vote = challenge.Votes?.FirstOrDefault(v => v.VoterUserId == currentUserId);

        return new ChallengeResponseDto
        {
            Id = challenge.Id,
            Title = challenge.Title,
            Description = challenge.Description,
            LogoUrl = challenge.LogoUrl,
            SoundUrl = challenge.SoundUrl,
            UploadType = challenge.UploadType,
            Status = challenge.Status,
            DeadlineUtc = challenge.DeadlineUtc,
            StartAtUtc = challenge.StartAtUtc,
            EndAtUtc = challenge.EndAtUtc,
            FirstPlacePts = challenge.FirstPlacePts,
            SecondPlacePts = challenge.SecondPlacePts,
            ThirdPlacePts = challenge.ThirdPlacePts,
            CurrentUserRoleId = participant?.Id,
            CurrentUserRole = participant?.Role,
            CurrentUserSubmissionId = submission?.Id,
            CurrentUserVotedSubmissionId = vote?.SubmissionId,
            HasCurrentUserJoined = participant != null,
            HasCurrentUserSubmitted = submission != null,
            HasCurrentUserVoted = vote != null
        };
    }
}
