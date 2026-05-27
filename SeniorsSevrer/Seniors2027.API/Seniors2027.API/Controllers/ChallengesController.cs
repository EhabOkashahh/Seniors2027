using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs.Challenges;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChallengesController(
    IChallengeService challengeService,
    IChallengeMediaUploadProcessor challengeMediaUploadProcessor,
    AppDbContext context) : ControllerBase
{
    private readonly IChallengeService _challengeService = challengeService;
    private readonly IChallengeMediaUploadProcessor _challengeMediaUploadProcessor = challengeMediaUploadProcessor;
    private readonly AppDbContext _context = context;

    [HttpGet("current")]
    public async Task<ActionResult<ChallengeResponseDto>> GetCurrentChallenge()
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            var challenge = await _challengeService.GetCurrentChallengeAsync(currentUserId);

            if (challenge == null)
            {
                return NotFound("No active challenge right now.");
            }

            return Ok(challenge);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{challengeId:int}/join")]
    public async Task<ActionResult<ChallengeResponseDto>> JoinChallenge(int challengeId, [FromBody] JoinChallengeRequestDto dto)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            var updatedChallenge = await _challengeService.JoinChallengeAsync(challengeId, currentUserId, dto);
            return Ok(updatedChallenge);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{challengeId:int}/submissions")]
    public async Task<ActionResult<List<ChallengeSubmissionResponseDto>>> GetChallengeSubmissions(int challengeId)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            var submissions = await _challengeService.GetChallengeSubmissionsAsync(challengeId, currentUserId);
            return Ok(submissions);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("not found") || ex.Message.Contains("hidden"))
            {
                return NotFound(ex.Message);
            }
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("latest-ended")]
    public async Task<ActionResult<ChallengeWithLeaderboardResponseDto>> GetLatestEndedChallenge()
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        var result = await _challengeService.GetLatestEndedChallengeAsync(currentUserId);
        if (result == null) return NotFound("No ended challenge found.");

        return Ok(result);
    }

    [HttpPost("{challengeId:int}/submissions")]
    public async Task<ActionResult<ChallengeSubmissionResponseDto>> UploadSubmission(
        int challengeId,
        [FromForm] IFormFile media,
        [FromForm] string? caption)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            // We need to know the challenge's expected upload type for the processor
            var challenge = await _context.Challenges.FindAsync(challengeId);
            if (challenge == null) return NotFound("Challenge not found.");

            var relativeUrl = await _challengeMediaUploadProcessor.SaveChallengeMediaAsync(media, challenge.UploadType);
            var mediaUrl = $"{Request.Scheme}://{Request.Host}{relativeUrl}";

            var dto = new CreateChallengeSubmissionRequestDto { Caption = caption };
            var response = await _challengeService.UploadChallengeSubmissionAsync(
                challengeId,
                currentUserId,
                mediaUrl,
                challenge.UploadType,
                dto);

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{challengeId:int}/submissions")]
    public async Task<ActionResult> DeleteSubmission(int challengeId)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            await _challengeService.DeleteChallengeSubmissionAsync(challengeId, currentUserId);
            return Ok("Submission deleted.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{challengeId:int}/submissions/{submissionId:int}/vote")]
    public async Task<ActionResult<VoteChallengeSubmissionResponseDto>> VoteForSubmission(int challengeId, int submissionId)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            var result = await _challengeService.VoteForSubmissionAsync(challengeId, submissionId, currentUserId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{challengeId:int}/leaderboard")]
    public async Task<ActionResult<List<ChallengeLeaderboardItemDto>>> GetChallengeLeaderboard(int challengeId)
    {
        if (!User.TryGetUserId(out var currentUserId)) return Unauthorized();

        try
        {
            var leaderboard = await _challengeService.GetChallengeLeaderboardAsync(challengeId, currentUserId);
            return Ok(leaderboard);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("not found") || ex.Message.Contains("hidden"))
            {
                return NotFound(ex.Message);
            }
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{challengeId:int}/messages")]
    public async Task<ActionResult<List<ChallengeMessageDto>>> GetMessages(int challengeId)
    {
        var messages = await _context.ChallengeMessages
            .Where(m => m.ChallengeId == challengeId)
            .OrderBy(m => m.CreatedAtUtc)
            .Select(m => new ChallengeMessageDto
            {
                Id = m.Id,
                ChallengeId = m.ChallengeId,
                UserId = m.UserId,
                UserName = m.User.Username,
                UserPhotoUrl = m.User.PhotoUrl,
                UserColor = "var(--accent-blue)",
                Text = m.Text,
                CreatedAtUtc = m.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(messages);
    }
}
