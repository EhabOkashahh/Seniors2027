using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs.Challenges;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class ChallengeService : IChallengeService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    public ChallengeService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
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
            if (dto.StartAtUtc <= DateTime.UtcNow)
                throw new InvalidOperationException("StartAtUtc must be in the future when activating a challenge.");

            var hasActive = await _context.Challenges.AnyAsync(c => c.Status == "Active", cancellationToken);
            if (hasActive)
                throw new InvalidOperationException("An active challenge already exists.");
        }

        if (dto.Status == "BeforeStart")
        {
            if (dto.StartAtUtc < DateTime.UtcNow.AddMinutes(-5))
                throw new InvalidOperationException("Start date for 'BeforeStart' challenge cannot be in the past.");
        }

        if (dto.MinParticipants < 1)
            throw new InvalidOperationException("Minimum participants must be at least 1.");

        if (dto.MinSubmissions < 1)
            throw new InvalidOperationException("Minimum submissions must be at least 1.");

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
            MinParticipants = dto.MinParticipants,
            MinSubmissions = dto.MinSubmissions,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _context.Challenges.Add(challenge);
        await _context.SaveChangesAsync(cancellationToken);

        if (dto.Status != "Hidden" && dto.Status != "Ended")
        {
            var allUserIds = await _context.Users
                .Where(u => u.IsLocked == false)
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            foreach (var uid in allUserIds)
            {
                await _notificationService.CreateNotificationAsync(
                    uid,
                    "new_challenge",
                    $"New challenge: {challenge.Title}",
                    $"/challenge?challengeId={challenge.Id}");
            }
        }

        return MapToChallengeResponseDto(challenge, createdByUserId);
    }

    public async Task<ChallengeResponseDto?> GetCurrentChallengeAsync(
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        await AutoEndExpiredChallengesAsync(cancellationToken);

        var challenge = await _context.Challenges
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Submissions.Where(s => s.UserId == currentUserId))
            .Include(c => c.Votes.Where(v => v.VoterUserId == currentUserId))
            .Include(c => c.Teams)
                .ThenInclude(t => t.Members)
                    .ThenInclude(m => m.User)
            .Include(c => c.Teams)
                .ThenInclude(t => t.Submission)
            .Where(c => c.Status != "Hidden" && c.Status != "Ended")
            .OrderByDescending(c => c.Status == "Active" ? 3 : c.Status == "BeforeStart" ? 2 : 1)
            .ThenByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (challenge == null)
            return null;

        return MapToChallengeResponseDto(challenge, currentUserId);
    }

    public async Task<ChallengeWithLeaderboardResponseDto?> GetLatestEndedChallengeAsync(
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Where(c => c.Status == "Ended")
            .OrderByDescending(c => c.EndAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (challenge == null)
            return null;

        var allWinners = await GetLeaderboardInternalAsync(challenge, currentUserId, cancellationToken);
        var top3 = allWinners.Where(w => w.Rank <= 3).ToList();

        return new ChallengeWithLeaderboardResponseDto
        {
            Id = challenge.Id,
            Title = challenge.Title,
            Description = challenge.Description,
            LogoUrl = challenge.LogoUrl,
            UploadType = challenge.UploadType,
            FirstPlacePts = challenge.FirstPlacePts,
            SecondPlacePts = challenge.SecondPlacePts,
            ThirdPlacePts = challenge.ThirdPlacePts,
            Winners = top3
        };
    }

    public async Task<ChallengeResponseDto> JoinChallengeAsync(
        int challengeId,
        int currentUserId,
        JoinChallengeRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        await AutoEndExpiredChallengesAsync(cancellationToken);

        var challenge = await _context.Challenges
            .Include(c => c.Participants.Where(p => p.UserId == currentUserId))
            .Include(c => c.Submissions.Where(s => s.UserId == currentUserId))
            .Include(c => c.Votes.Where(v => v.VoterUserId == currentUserId))
            .Include(c => c.Teams)
                .ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status == "Hidden" || challenge.Status == "Ended")
            throw new InvalidOperationException($"Cannot join a challenge that is {challenge.Status}.");

        if (dto.Role != "Challenger" && dto.Role != "Spectator")
            throw new InvalidOperationException("Role must be 'Challenger' or 'Spectator'.");

        // Block new joins during voting phase
        if (challenge.Status == "Active" && DateTime.UtcNow >= challenge.StartAtUtc)
        {
            var existingParticipant = challenge.Participants.FirstOrDefault(p => p.UserId == currentUserId);
            if (existingParticipant == null)
                throw new InvalidOperationException("Cannot join a challenge after the voting phase has started.");
            if (existingParticipant.Role != dto.Role)
                throw new InvalidOperationException("Cannot switch roles after the voting phase has started.");
        }

        var participant = challenge.Participants.FirstOrDefault(p => p.UserId == currentUserId);

        if (participant != null)
        {
            // Allow role switch before StartAtUtc
            if (participant.Role != dto.Role)
            {
                participant.Role = dto.Role;

                // Delete user's submission when switching roles
                var existingSubmission = challenge.Submissions.FirstOrDefault(s => s.UserId == currentUserId);
                if (existingSubmission != null)
                {
                    if (!string.IsNullOrWhiteSpace(existingSubmission.MediaUrl))
                    {
                        var oldFileName = Path.GetFileName(existingSubmission.MediaUrl);
                        var oldMediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", oldFileName);
                        if (File.Exists(oldMediaPath))
                            File.Delete(oldMediaPath);
                    }
                    _context.ChallengeSubmissions.Remove(existingSubmission);
                }
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

        // Before start time, hide all submissions from everyone
        if (challenge.Status == "Active" && DateTime.UtcNow < challenge.StartAtUtc)
            return new List<ChallengeSubmissionResponseDto>();

        var submissions = await _context.ChallengeSubmissions
            .AsNoTracking()
            .Include(s => s.Team).ThenInclude(t => t.Members)
            .Include(s => s.Votes)
            .Include(s => s.User)
            .Where(s => s.ChallengeId == challengeId)
            .OrderByDescending(s => s.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return submissions.Select(s =>
        {
            var isTeam = s.Team != null;
            var isOwn = s.UserId == currentUserId || (isTeam && s.Team.Members.Any(m => m.UserId == currentUserId));
            return new ChallengeSubmissionResponseDto
            {
                Id = s.Id,
                ChallengeId = s.ChallengeId,
                UserId = s.UserId,
                UserName = s.User?.Username ?? "Unknown",
                UserPhotoUrl = s.User?.PhotoUrl,
                MediaUrl = s.MediaUrl,
                MediaType = s.MediaType,
                Caption = s.Caption,
                Votes = s.Votes?.Count ?? 0,
                IsOwn = isOwn,
                IsVotedByCurrentUser = s.Votes != null && s.Votes.Any(v => v.VoterUserId == currentUserId),
                CreatedAtUtc = s.CreatedAtUtc,
                TeamName = isTeam ? s.Team.Name : null,
                IsTeamOwner = isTeam && s.UserId == currentUserId,
                TeamMembers = isTeam
                    ? s.Team.Members.Select(m => new TeamMemberInfoDto
                    {
                        UserId = m.UserId,
                        Username = m.User?.Username ?? "Unknown",
                        PhotoUrl = m.User?.PhotoUrl
                    }).ToList()
                    : new List<TeamMemberInfoDto>()
            };
        }).ToList();
    }

    public async Task<ChallengeSubmissionResponseDto> UploadChallengeSubmissionAsync(
        int challengeId,
        int currentUserId,
        string mediaUrl,
        string mediaType,
        CreateChallengeSubmissionRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        await AutoEndExpiredChallengesAsync(cancellationToken);

        var challenge = await _context.Challenges
            .Include(c => c.Participants)
            .Include(c => c.Submissions)
            .Include(c => c.Teams)
                .ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status != "Active")
            throw new InvalidOperationException($"Cannot upload to a challenge that is {challenge.Status}.");

        if (DateTime.UtcNow >= challenge.StartAtUtc)
            throw new InvalidOperationException("Upload period has ended. Voting has already started.");

        var participant = challenge.Participants.FirstOrDefault(p => p.UserId == currentUserId);
        if (participant == null)
            throw new InvalidOperationException("You must join the challenge before uploading.");

        if (participant.Role != "Challenger")
            throw new InvalidOperationException("Only Challengers can upload submissions. Spectators are just here to judge.");

        if (dto.Caption?.Length > 120)
            throw new InvalidOperationException("Caption cannot exceed 120 characters.");

        // --- Parse team member IDs ---
        var allTeamMemberIds = dto.TeamMemberIds?.Distinct().ToList() ?? new List<int>();
        
        if (allTeamMemberIds.Contains(currentUserId))
            throw new InvalidOperationException("You cannot add yourself as a team member.");

        if (allTeamMemberIds.Count > 10)
            throw new InvalidOperationException("Team cannot have more than 10 members.");

        // Verify all team members are challengers
        foreach (var memberId in allTeamMemberIds)
        {
            var memberParticipant = challenge.Participants.FirstOrDefault(p => p.UserId == memberId);
            if (memberParticipant == null)
                throw new InvalidOperationException($"User {memberId} has not joined this challenge.");
            if (memberParticipant.Role != "Challenger")
                throw new InvalidOperationException($"User {memberId} is a spectator, not a challenger.");
        }

        // --- Handle re-submission FIRST (before team conflict check) ---
        var existingSubmission = await _context.ChallengeSubmissions
            .FirstOrDefaultAsync(s => s.ChallengeId == challengeId && s.UserId == currentUserId, cancellationToken);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (existingSubmission != null)
            {
                // Delete old media file
                if (!string.IsNullOrWhiteSpace(existingSubmission.MediaUrl))
                {
                    var oldFileName = Path.GetFileName(existingSubmission.MediaUrl);
                    var oldMediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", oldFileName);
                    if (File.Exists(oldMediaPath))
                        File.Delete(oldMediaPath);
                }

                // If submission was part of a team, delete the team too
                if (existingSubmission.TeamId.HasValue)
                {
                    var oldTeam = await _context.ChallengeTeams
                        .FirstOrDefaultAsync(t => t.Id == existingSubmission.TeamId.Value, cancellationToken);
                    if (oldTeam != null)
                    {
                        var localTeam = challenge.Teams.FirstOrDefault(t => t.Id == oldTeam.Id);
                        if (localTeam != null) challenge.Teams.Remove(localTeam);

                        // Break circular dependency
                        oldTeam.SubmissionId = null;
                        existingSubmission.TeamId = null;
                        await _context.SaveChangesAsync(cancellationToken);

                        _context.ChallengeTeams.Remove(oldTeam);
                    }
                }

                _context.ChallengeSubmissions.Remove(existingSubmission);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // --- Verify selected team members aren't already in another team ---
            if (allTeamMemberIds.Count > 0)
            {
                var existingTeamUserIds = await _context.ChallengeTeamMembers
                    .Where(m => m.Team.ChallengeId == challengeId && m.Team.SubmissionId != null)
                    .Select(m => m.UserId)
                    .ToListAsync(cancellationToken);

                var conflictId = allTeamMemberIds.FirstOrDefault(mid => existingTeamUserIds.Contains(mid));
                if (conflictId != 0)
                    throw new InvalidOperationException($"User {conflictId} is already part of another team.");
            }

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

            // Create team if TeamName provided OR team members provided
            if (!string.IsNullOrWhiteSpace(dto.TeamName) || allTeamMemberIds.Count > 0)
            {
                var user = await _context.Users.AsNoTracking().FirstAsync(u => u.Id == currentUserId, cancellationToken);
                var teamName = string.IsNullOrWhiteSpace(dto.TeamName) ? $"Team {user.Username}" : dto.TeamName;

                var team = new ChallengeTeam
                {
                    ChallengeId = challengeId,
                    SubmissionId = submission.Id,
                    Name = teamName,
                    CreatedAtUtc = DateTime.UtcNow
                };

                // Add uploader as a team member
                team.Members.Add(new ChallengeTeamMember { UserId = currentUserId });

                foreach (var memberId in allTeamMemberIds)
                {
                    team.Members.Add(new ChallengeTeamMember { UserId = memberId });
                }

                _context.ChallengeTeams.Add(team);
                await _context.SaveChangesAsync(cancellationToken);

                submission.TeamId = team.Id;
                await _context.SaveChangesAsync(cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);

            // Build response
            var finalUser = await _context.Users.AsNoTracking().FirstAsync(u => u.Id == currentUserId, cancellationToken);
            var response = new ChallengeSubmissionResponseDto
            {
                Id = submission.Id,
                ChallengeId = submission.ChallengeId,
                UserId = submission.UserId,
                UserName = finalUser.Username,
                UserPhotoUrl = finalUser.PhotoUrl,
                MediaUrl = submission.MediaUrl,
                MediaType = submission.MediaType,
                Caption = submission.Caption,
                Votes = 0,
                IsOwn = true,
                IsVotedByCurrentUser = false,
                CreatedAtUtc = submission.CreatedAtUtc
            };

            if (submission.TeamId.HasValue)
            {
                var team = await _context.ChallengeTeams
                    .AsNoTracking()
                    .Include(t => t.Members).ThenInclude(m => m.User)
                    .FirstAsync(t => t.Id == submission.TeamId.Value, cancellationToken);

                response.TeamName = team.Name;
                response.IsTeamOwner = true;
                response.TeamMembers = team.Members.Select(m => new TeamMemberInfoDto
                {
                    UserId = m.UserId,
                    Username = m.User?.Username ?? "Unknown",
                    PhotoUrl = m.User?.PhotoUrl
                }).ToList();
            }

            return response;
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task DeleteChallengeSubmissionAsync(
        int challengeId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Teams).ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status != "Active")
            throw new InvalidOperationException($"Cannot delete a submission from a challenge that is {challenge.Status}.");

        if (DateTime.UtcNow >= challenge.StartAtUtc)
            throw new InvalidOperationException("Upload period has ended. You cannot delete your submission.");

        var submission = await _context.ChallengeSubmissions
            .Include(s => s.Team).ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(s => s.ChallengeId == challengeId && s.UserId == currentUserId, cancellationToken);

        // If not the owner, check if user is a team member of a submission
        if (submission == null)
        {
            submission = await _context.ChallengeSubmissions
                .Include(s => s.Team).ThenInclude(t => t.Members)
                .FirstOrDefaultAsync(s => s.ChallengeId == challengeId && s.Team != null && s.Team.Members.Any(m => m.UserId == currentUserId), cancellationToken);
        }

        if (submission == null)
            throw new InvalidOperationException("You don't have a submission to delete.");

        // Delete media file
        if (!string.IsNullOrWhiteSpace(submission.MediaUrl))
        {
            var fileName = Path.GetFileName(submission.MediaUrl);
            var mediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", fileName);
            if (File.Exists(mediaPath))
                File.Delete(mediaPath);
        }

        // Delete any votes for this submission
        var votes = await _context.ChallengeVotes
            .Where(v => v.SubmissionId == submission.Id)
            .ToListAsync(cancellationToken);
        if (votes.Any())
            _context.ChallengeVotes.RemoveRange(votes);

        // Delete team if this submission was part of a team
        if (submission.TeamId.HasValue)
        {
            var team = await _context.ChallengeTeams
                .FirstOrDefaultAsync(t => t.Id == submission.TeamId.Value, cancellationToken);
            if (team != null)
            {
                // Break circular dependency before deletion
                team.SubmissionId = null;
                submission.TeamId = null;
                await _context.SaveChangesAsync(cancellationToken);

                _context.ChallengeTeams.Remove(team);
            }
        }

        _context.ChallengeSubmissions.Remove(submission);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<VoteChallengeSubmissionResponseDto> VoteForSubmissionAsync(
        int challengeId,
        int submissionId,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        await AutoEndExpiredChallengesAsync(cancellationToken);

        var challenge = await _context.Challenges
            .Include(c => c.Participants.Where(p => p.UserId == currentUserId))
            .Include(c => c.Votes.Where(v => v.VoterUserId == currentUserId))
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status != "Active")
            throw new InvalidOperationException($"Cannot vote in a challenge that is {challenge.Status}.");

        if (DateTime.UtcNow < challenge.StartAtUtc)
            throw new InvalidOperationException("Voting has not started yet.");

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

        // Team members cannot vote for their own team's submission
        if (submission.TeamId.HasValue)
        {
            var team = await _context.ChallengeTeams
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == submission.TeamId.Value, cancellationToken);
            if (team != null && team.Members.Any(m => m.UserId == currentUserId))
                throw new InvalidOperationException("You cannot vote for your own team's submission.");
        }

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
            .Include(c => c.Participants)
            .Include(c => c.Votes)
            .Include(c => c.Submissions)
            .Include(c => c.Messages)
            .Include(c => c.Teams).ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        if (challenge.Status == "Hidden")
            throw new InvalidOperationException("Cannot end a hidden challenge.");

        if (challenge.Status == "Ended")
            throw new InvalidOperationException("Challenge is already ended.");

        if (challenge.Status == "BeforeStart")
            throw new InvalidOperationException("Cannot end a challenge that has not started.");

        if (DateTime.UtcNow < challenge.StartAtUtc)
            throw new InvalidOperationException("Cannot end a challenge before the voting phase has started.");

        var now = DateTime.UtcNow;

        // Atomically mark challenge so only one request processes it
        var rows = await _context.Database.ExecuteSqlRawAsync(
            "UPDATE Challenges SET Status = 'Ended', UpdatedAtUtc = {0} WHERE Id = {1} AND Status = 'Active'",
            new object[] { now, challengeId }, cancellationToken);
        if (rows == 0)
            throw new InvalidOperationException("Challenge is already being ended by another request.");

        // Reload to get fresh data after the atomic update
        challenge = await _context.Challenges
            .Include(c => c.Participants)
            .Include(c => c.Votes)
            .Include(c => c.Submissions)
            .Include(c => c.Messages)
            .Include(c => c.Teams).ThenInclude(t => t.Members)
            .FirstAsync(c => c.Id == challengeId, cancellationToken);

        // Cancel if too few challengers or submissions
        var challengerCount = challenge.Participants.Count(p => p.Role == "Challenger");
        if (challengerCount < challenge.MinParticipants || challenge.Submissions.Count < challenge.MinSubmissions)
        {
            // Delete uploaded submission media files
            foreach (var submission in challenge.Submissions)
            {
                if (!string.IsNullOrWhiteSpace(submission.MediaUrl))
                {
                    var fileName = Path.GetFileName(submission.MediaUrl);
                    var mediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", fileName);
                    if (File.Exists(mediaPath))
                        File.Delete(mediaPath);
                }
            }

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Challenges SET Status = 'Hidden', UpdatedAtUtc = {0} WHERE Id = {1}",
                new object[] { now, challengeId }, cancellationToken);
            return new List<ChallengeLeaderboardItemDto>();
        }

        // Build set of userIds covered by a submission (direct or via team)
        var coveredUserIds = new HashSet<int>();
        foreach (var s in challenge.Submissions)
        {
            coveredUserIds.Add(s.UserId);
            if (s.TeamId.HasValue)
            {
                var team = challenge.Teams?.FirstOrDefault(t => t.Id == s.TeamId.Value);
                if (team != null)
                {
                    foreach (var m in team.Members)
                        coveredUserIds.Add(m.UserId);
                }
            }
        }

        // Penalize challengers who didn't upload or join a team
        foreach (var participant in challenge.Participants.Where(p => p.Role == "Challenger"))
        {
            if (!coveredUserIds.Contains(participant.UserId))
            {
                var user = await _context.Users.FindAsync([participant.UserId], cancellationToken);
                if (user != null)
                {
                    user.Points = Math.Max(0, user.Points - 30);
                }
            }
        }

        // Get winners to award points
        var winners = await GetLeaderboardInternalAsync(challenge, adminUserId, cancellationToken);

        foreach (var winner in winners)
        {
            if (winner.TeamMembers.Count > 0)
            {
                // Split points among all team members
                foreach (var member in winner.TeamMembers)
                {
                    var user = await _context.Users.FindAsync([member.UserId], cancellationToken);
                    if (user != null)
                    {
                        user.Points += winner.PointsEarned;
                    }
                }
            }
            else
            {
                var user = await _context.Users.FindAsync([winner.UserId], cancellationToken);
                if (user != null)
                {
                    user.Points += winner.PointsEarned;
                }
            }
        }

        // Delete submission media files (keep logo)
        foreach (var submission in challenge.Submissions)
        {
            if (!string.IsNullOrWhiteSpace(submission.MediaUrl))
            {
                var fileName = Path.GetFileName(submission.MediaUrl);
                var mediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", fileName);
                if (File.Exists(mediaPath))
                    File.Delete(mediaPath);
            }
        }

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
            .Include(c => c.Teams).ThenInclude(t => t.Members)
            .FirstOrDefaultAsync(c => c.Id == challengeId, cancellationToken);

        if (challenge == null)
            throw new InvalidOperationException("Challenge not found.");

        // Delete logo file from disk
        if (!string.IsNullOrWhiteSpace(challenge.LogoUrl))
        {
            var logoFileName = Path.GetFileName(challenge.LogoUrl);
            var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", logoFileName);
            if (File.Exists(logoPath))
                File.Delete(logoPath);
        }

        // We delete in order just to be safe with the Restrict constraints
        if (challenge.Votes.Any())
        {
            _context.ChallengeVotes.RemoveRange(challenge.Votes);
        }

        // Break circular dependencies before bulk delete
        foreach (var team in challenge.Teams) team.SubmissionId = null;
        foreach (var sub in challenge.Submissions) sub.TeamId = null;
        await _context.SaveChangesAsync(cancellationToken);

        if (challenge.Teams.Any())
        {
            _context.ChallengeTeams.RemoveRange(challenge.Teams);
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
        await AutoEndExpiredChallengesAsync(cancellationToken);

        var challenges = await _context.Challenges
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return challenges.Select(c => MapToChallengeResponseDto(c, adminUserId)).ToList();
    }

    private async Task CleanupChallengeDataAsync(Challenge challenge, CancellationToken cancellationToken)
    {
        // Load related data if not already loaded
        await _context.Entry(challenge).Collection(c => c.Votes).LoadAsync(cancellationToken);
        await _context.Entry(challenge).Collection(c => c.Submissions).LoadAsync(cancellationToken);
        await _context.Entry(challenge).Collection(c => c.Participants).LoadAsync(cancellationToken);
        await _context.Entry(challenge).Collection(c => c.Messages).LoadAsync(cancellationToken);

        // Delete submission media files (keep logo)
        foreach (var submission in challenge.Submissions)
        {
            if (!string.IsNullOrWhiteSpace(submission.MediaUrl))
            {
                var fileName = Path.GetFileName(submission.MediaUrl);
                var mediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", fileName);
                if (File.Exists(mediaPath))
                    File.Delete(mediaPath);
            }
        }

        if (challenge.Votes.Any())
            _context.ChallengeVotes.RemoveRange(challenge.Votes);

        if (challenge.Submissions.Any())
            _context.ChallengeSubmissions.RemoveRange(challenge.Submissions);

        if (challenge.Messages.Any())
            _context.ChallengeMessages.RemoveRange(challenge.Messages);

        if (challenge.Participants.Any())
            _context.ChallengeParticipants.RemoveRange(challenge.Participants);
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

        if (dto.MinParticipants < 1)
            throw new InvalidOperationException("Minimum participants must be at least 1.");

        if (dto.MinSubmissions < 1)
            throw new InvalidOperationException("Minimum submissions must be at least 1.");

        // When reactivating from Ended, wipe all old data so it starts fresh
        if (challenge.Status == "Ended" && (dto.Status == "Active" || dto.Status == "BeforeStart"))
        {
            await CleanupChallengeDataAsync(challenge, cancellationToken);
        }

        if (dto.Status == "Active" && challenge.Status != "Active")
        {
            if (dto.StartAtUtc <= DateTime.UtcNow)
                throw new InvalidOperationException("StartAtUtc must be in the future when activating a challenge.");

            var hasActive = await _context.Challenges.AnyAsync(c => c.Status == "Active" && c.Id != challengeId, cancellationToken);
            if (hasActive)
                throw new InvalidOperationException("Another active challenge already exists.");
        }

        var oldStatus = challenge.Status;

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
        challenge.MinParticipants = dto.MinParticipants;
        challenge.MinSubmissions = dto.MinSubmissions;
        challenge.UpdatedAtUtc = DateTime.UtcNow;

        if (logoUrl != null)
        {
            // Delete old logo file when replacing with new one
            if (!string.IsNullOrWhiteSpace(challenge.LogoUrl))
            {
                var oldLogoFileName = Path.GetFileName(challenge.LogoUrl);
                var oldLogoPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", oldLogoFileName);
                if (File.Exists(oldLogoPath))
                    File.Delete(oldLogoPath);
            }
            challenge.LogoUrl = logoUrl;
        }
        else if (dto.RemoveLogo)
        {
            // Delete old logo file from disk
            if (!string.IsNullOrWhiteSpace(challenge.LogoUrl))
            {
                var oldLogoFileName = Path.GetFileName(challenge.LogoUrl);
                var oldLogoPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", oldLogoFileName);
                if (File.Exists(oldLogoPath))
                    File.Delete(oldLogoPath);
            }
            challenge.LogoUrl = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var newStatus = challenge.Status;
        if (oldStatus == "Hidden" && newStatus != "Hidden" && newStatus != "Ended")
        {
            var allUserIds = await _context.Users
                .Where(u => u.IsLocked == false)
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            foreach (var uid in allUserIds)
            {
                await _notificationService.CreateNotificationAsync(
                    uid,
                    "new_challenge",
                    $"New challenge: {challenge.Title}",
                    $"/challenge?challengeId={challenge.Id}");
            }
        }

        return MapToChallengeResponseDto(challenge, adminUserId);
    }

    private async Task<List<ChallengeLeaderboardItemDto>> GetLeaderboardInternalAsync(
        Challenge challenge, 
        int currentUserId, 
        CancellationToken cancellationToken)
    {
        var topSubmissions = await _context.ChallengeSubmissions
            .AsNoTracking()
            .Include(s => s.Team).ThenInclude(t => t.Members).ThenInclude(m => m.User)
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
                s.Team,
                VoteCount = s.Votes.Count
            })
            .OrderByDescending(s => s.VoteCount)
            .ThenBy(s => s.CreatedAtUtc)
            .Take(3)
            .ToListAsync(cancellationToken);

        // Points per member for team entries
        int splitAmong(int place)
        {
            var pts = place == 0 ? challenge.FirstPlacePts :
                      place == 1 ? challenge.SecondPlacePts :
                      challenge.ThirdPlacePts;
            return pts;
        }

        return topSubmissions.Select((s, index) =>
        {
            var basePts = splitAmong(index);
            var isTeam = s.Team != null && s.Team.Members.Count > 1;
            var memberCount = isTeam ? s.Team.Members.Count : 1;
            var ptsPerMember = isTeam ? basePts / memberCount : basePts;

            var dto = new ChallengeLeaderboardItemDto
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
                IsOwn = s.UserId == currentUserId || (s.Team != null && s.Team.Members.Any(m => m.UserId == currentUserId)),
                PointsEarned = isTeam ? ptsPerMember : basePts
            };

            if (isTeam)
            {
                dto.TeamName = s.Team.Name;
                dto.IsTeamOwner = s.UserId == currentUserId;
                dto.UserId = 0; // Not meaningful for teams
                dto.UserName = s.Team.Name;
                dto.UserPhotoUrl = null;
                dto.TeamMembers = s.Team.Members.Select(m => new TeamMemberInfoDto
                {
                    UserId = m.UserId,
                    Username = m.User?.Username ?? "Unknown",
                    PhotoUrl = m.User?.PhotoUrl
                }).ToList();
            }

            return dto;
        }).ToList();
    }

    private async Task AutoEndExpiredChallengesAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        // 1. Handle cancellation (StartAtUtc just passed): cancel if too few participants
        var cancelCandidates = await _context.Challenges
            .Include(c => c.Participants)
            .Include(c => c.Submissions)
            .Where(c => c.Status == "Active" && c.StartAtUtc <= now && c.EndAtUtc > now)
            .ToListAsync(cancellationToken);

        foreach (var c in cancelCandidates)
        {
            var challengerCount = c.Participants.Count(p => p.Role == "Challenger");
            if (challengerCount < c.MinParticipants || c.Submissions.Count < c.MinSubmissions)
            {
                // Delete uploaded submission media files
                foreach (var submission in c.Submissions)
                {
                    if (!string.IsNullOrWhiteSpace(submission.MediaUrl))
                    {
                        var fileName = Path.GetFileName(submission.MediaUrl);
                        var mediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", fileName);
                        if (File.Exists(mediaPath))
                            File.Delete(mediaPath);
                    }
                }

                // Atomically mark as Hidden — only the first request wins
                var rows = await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Challenges SET Status = 'Hidden', UpdatedAtUtc = {0} WHERE Id = {1} AND Status = 'Active'",
                    new object[] { now, c.Id }, cancellationToken);
                if (rows == 0) continue;
            }
        }

        // 2. Handle truly expired (EndAtUtc passed)
        var expiredCandidates = await _context.Challenges
            .Include(c => c.Participants)
            .Include(c => c.Votes)
            .Include(c => c.Submissions)
            .Include(c => c.Messages)
            .Include(c => c.Teams).ThenInclude(t => t.Members)
            .Where(c => c.Status == "Active" && c.EndAtUtc <= now)
            .ToListAsync(cancellationToken);

        foreach (var c in expiredCandidates)
        {
            // Atomically mark as Ended — only the first request wins
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Challenges SET Status = 'Ended', UpdatedAtUtc = {0} WHERE Id = {1} AND Status = 'Active'",
                new object[] { now, c.Id }, cancellationToken);
            if (rows == 0) continue;

            // Build set of userIds covered by a submission (direct or via team)
            var coveredUserIds = new HashSet<int>();
            foreach (var s in c.Submissions)
            {
                coveredUserIds.Add(s.UserId);
                if (s.TeamId.HasValue)
                {
                    var team = c.Teams?.FirstOrDefault(t => t.Id == s.TeamId.Value);
                    if (team != null)
                    {
                        foreach (var m in team.Members)
                            coveredUserIds.Add(m.UserId);
                    }
                }
            }

            // Penalize challengers who didn't upload or join a team
            foreach (var participant in c.Participants.Where(p => p.Role == "Challenger"))
            {
                if (!coveredUserIds.Contains(participant.UserId))
                {
                    var user = await _context.Users.FindAsync([participant.UserId], cancellationToken);
                    if (user != null)
                    {
                        user.Points = Math.Max(0, user.Points - 30);
                    }
                }
            }

            // Award points to winners
            var winners = await GetLeaderboardInternalAsync(c, 0, cancellationToken);
            foreach (var winner in winners)
            {
                if (winner.TeamMembers.Count > 0)
                {
                    foreach (var member in winner.TeamMembers)
                    {
                        var user = await _context.Users.FindAsync([member.UserId], cancellationToken);
                        if (user != null)
                            user.Points += winner.PointsEarned;
                    }
                }
                else
                {
                    var user = await _context.Users.FindAsync([winner.UserId], cancellationToken);
                    if (user != null)
                        user.Points += winner.PointsEarned;
                }
            }

            // Delete submission media files (keep logo)
            foreach (var submission in c.Submissions)
            {
                if (!string.IsNullOrWhiteSpace(submission.MediaUrl))
                {
                    var fileName = Path.GetFileName(submission.MediaUrl);
                    var mediaPath = Path.Combine(Directory.GetCurrentDirectory(), "ChallengeMedia", fileName);
                    if (File.Exists(mediaPath))
                        File.Delete(mediaPath);
                }
            }
        }

        if (expiredCandidates.Count > 0)
            await _context.SaveChangesAsync(cancellationToken);
    }

    private ChallengeResponseDto MapToChallengeResponseDto(Challenge challenge, int currentUserId)
    {
        var participant = challenge.Participants?.FirstOrDefault(p => p.UserId == currentUserId);
        var submission = challenge.Submissions?.FirstOrDefault(s => s.UserId == currentUserId);
        var vote = challenge.Votes?.FirstOrDefault(v => v.VoterUserId == currentUserId);

        // Build a lookup of userId -> team info for team members
        var subOwnerByTeamId = challenge.Submissions?
            .Where(s => s.TeamId.HasValue)
            .ToDictionary(s => s.TeamId!.Value, s => s.UserId);
        var teamLookup = new Dictionary<int, (string Name, int TeamId, bool IsOwner)>();
        if (challenge.Teams != null)
        {
            foreach (var team in challenge.Teams)
            {
                if (team.Members == null) continue;
                int? ownerId = subOwnerByTeamId?.TryGetValue(team.Id, out var oid) == true ? oid : null;
                foreach (var member in team.Members)
                {
                    teamLookup[member.UserId] = (team.Name, team.Id, ownerId == member.UserId);
                }
            }
        }

        return new ChallengeResponseDto
        {
            Id = challenge.Id,
            Title = challenge.Title,
            Description = challenge.Description,
            LogoUrl = challenge.LogoUrl,
            SoundUrl = challenge.SoundUrl,
            UploadType = challenge.UploadType,
            Status = challenge.Status,
            DeadlineUtc = DateTime.SpecifyKind(challenge.DeadlineUtc, DateTimeKind.Utc),
            StartAtUtc = DateTime.SpecifyKind(challenge.StartAtUtc, DateTimeKind.Utc),
            EndAtUtc = DateTime.SpecifyKind(challenge.EndAtUtc, DateTimeKind.Utc),
            FirstPlacePts = challenge.FirstPlacePts,
            SecondPlacePts = challenge.SecondPlacePts,
            ThirdPlacePts = challenge.ThirdPlacePts,
            MinParticipants = challenge.MinParticipants,
            MinSubmissions = challenge.MinSubmissions,
            CurrentUserRoleId = participant?.Id,
            CurrentUserRole = participant?.Role,
            CurrentUserSubmissionId = submission?.Id,
            CurrentUserSubmissionMediaUrl = submission?.MediaUrl,
            CurrentUserSubmissionMediaType = submission?.MediaType,
            CurrentUserVotedSubmissionId = vote?.SubmissionId,
            HasCurrentUserJoined = participant != null,
            HasCurrentUserSubmitted = submission != null,
            HasCurrentUserVoted = vote != null,
            Participants = challenge.Participants?.Select(p =>
            {
                var dto = new ChallengeParticipantDto
                {
                    UserId = p.UserId,
                    Username = p.User?.Username ?? "Unknown",
                    PhotoUrl = p.User?.PhotoUrl,
                    Role = p.Role
                };

                if (teamLookup.TryGetValue(p.UserId, out var teamInfo))
                {
                    dto.TeamName = teamInfo.Name;
                    dto.TeamId = teamInfo.TeamId;
                    dto.IsTeamOwner = teamInfo.IsOwner;
                }

                return dto;
            }).ToList() ?? []
        };
    }
}
