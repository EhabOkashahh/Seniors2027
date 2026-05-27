using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.API.Services;
using Seniors2027.BLL.DTOs.Challenges;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/admin/challenges")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminChallengesController(
    IChallengeService challengeService,
    IChallengeMediaUploadProcessor challengeMediaUploadProcessor) : ControllerBase
{
    private readonly IChallengeService _challengeService = challengeService;
    private readonly IChallengeMediaUploadProcessor _challengeMediaUploadProcessor = challengeMediaUploadProcessor;

    [HttpGet]
    public async Task<ActionResult<List<ChallengeResponseDto>>> GetAllChallenges()
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        var challenges = await _challengeService.GetAllChallengesAdminAsync(adminUserId);
        return Ok(challenges);
    }

    [HttpPost]
    public async Task<ActionResult<ChallengeResponseDto>> CreateChallenge(
        [FromForm] CreateChallengeRequestDto dto,
        [FromForm] IFormFile? logo)
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        try
        {
            string? logoUrl = null;
            if (logo != null && logo.Length > 0)
            {
                logoUrl = await _challengeMediaUploadProcessor.SaveChallengeMediaAsync(logo, "Logo");
            }

            var challenge = await _challengeService.CreateChallengeAsync(dto, adminUserId, logoUrl);
            return Ok(challenge);
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

    [HttpPut("{challengeId:int}")]
    public async Task<ActionResult<ChallengeResponseDto>> UpdateChallenge(
        int challengeId,
        [FromForm] UpdateChallengeRequestDto dto,
        [FromForm] IFormFile? logo)
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        try
        {
            string? logoUrl = null;
            if (logo != null && logo.Length > 0)
            {
                logoUrl = await _challengeMediaUploadProcessor.SaveChallengeMediaAsync(logo, "Logo");
            }

            var challenge = await _challengeService.UpdateChallengeAsync(challengeId, dto, adminUserId, logoUrl);
            return Ok(challenge);
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

    [HttpPost("{challengeId:int}/end")]
    public async Task<ActionResult<List<ChallengeLeaderboardItemDto>>> EndChallenge(int challengeId)
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        try
        {
            var winners = await _challengeService.EndChallengeAsync(challengeId, adminUserId);
            return Ok(winners);
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

    [HttpDelete("{challengeId:int}")]
    public async Task<ActionResult> DeleteChallenge(int challengeId)
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        try
        {
            await _challengeService.DeleteChallengeAsync(challengeId, adminUserId);
            return NoContent();
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
}
