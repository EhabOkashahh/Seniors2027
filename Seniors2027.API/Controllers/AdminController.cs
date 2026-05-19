using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminController(IJoinRequestService joinRequestService) : ControllerBase
{
    private readonly IJoinRequestService _joinRequestService = joinRequestService;

    [HttpGet("join-requests")]
    public async Task<ActionResult<IReadOnlyList<JoinRequestDto>>> GetJoinRequests([FromQuery] JoinRequestStatus? status = JoinRequestStatus.Pending)
    {
        var requests = await _joinRequestService.GetJoinRequestsAsync(status);
        return Ok(requests);
    }

    [HttpPost("join-requests/{requestId:int}/decision")]
    public async Task<ActionResult<JoinRequestDto>> ReviewJoinRequest(int requestId, ReviewJoinRequestDto dto)
    {
        if (!User.TryGetUserId(out var reviewerUserId)) return Unauthorized();

        try
        {
            var updated = await _joinRequestService.ReviewJoinRequestAsync(requestId, dto.Decision, reviewerUserId);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
