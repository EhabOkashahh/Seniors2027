using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.BLL.DTOs.Challenges;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/admin/challenges")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminChallengesController(
    IChallengeService challengeService) : ControllerBase
{
    private readonly IChallengeService _challengeService = challengeService;

    [HttpGet]
    public async Task<ActionResult<List<ChallengeResponseDto>>> GetAllChallenges()
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        var challenges = await _challengeService.GetAllChallengesAdminAsync(adminUserId);
        return Ok(challenges);
    }

    [HttpPost]
    public async Task<ActionResult<ChallengeResponseDto>> CreateChallenge(
        [FromBody] CreateChallengeRequestDto dto)
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        try
        {
            var challenge = await _challengeService.CreateChallengeAsync(dto, adminUserId, dto.LogoUrl);
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
        [FromBody] UpdateChallengeRequestDto dto)
    {
        if (!User.TryGetUserId(out var adminUserId)) return Unauthorized();

        try
        {
            var challenge = await _challengeService.UpdateChallengeAsync(challengeId, dto, adminUserId, dto.LogoUrl);
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
