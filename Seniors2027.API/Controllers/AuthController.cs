using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUnitOfWork _unitOfWork;

    public AuthController(IAuthService authService, IUnitOfWork unitOfWork)
    {
        _authService = authService;
        _unitOfWork = unitOfWork;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult> GetMe()
    {
        var username = User.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value
            ?? User.FindFirst("unique_name")?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value;

        var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;

        User? user = null;

        if (!string.IsNullOrWhiteSpace(username))
        {
            user = _unitOfWork.Repository<User>()
                .Find(u => u.Username.ToLower() == username.ToLower())
                .FirstOrDefault();
        }

        if (user == null && int.TryParse(userIdClaim, out var userId))
        {
            user = _unitOfWork.Repository<User>()
                .Find(u => u.Id == userId)
                .FirstOrDefault();
        }

        if (user == null) return NotFound();

        return Ok(new
        {
            username = string.IsNullOrWhiteSpace(user.Username) ? "Senior" : user.Username,
            photoUrl = string.IsNullOrWhiteSpace(user.PhotoUrl) ? null : user.PhotoUrl,
            description = string.IsNullOrWhiteSpace(user.Description) ? null : user.Description
        });
    }

    [Authorize]
    [HttpPut("me/description")]
    public async Task<ActionResult> UpdateMyDescription(UpdateDescriptionDto dto)
    {
        var username = User.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value
            ?? User.FindFirst("unique_name")?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value;

        if (string.IsNullOrWhiteSpace(username)) return Unauthorized();

        var updated = await _authService.UpdateDescriptionAsync(username, dto.Description);
        if (!updated) return NotFound();

        return Ok(new { message = "Description updated successfully." });
    }

    [HttpGet("recognize/{username}")]
    public async Task<ActionResult> Recognize(string username)
    {
        var user = _unitOfWork.Repository<User>().Find(u => u.Username.ToLower() == username.ToLower()).FirstOrDefault();
        if (user == null) 
        {
            return NotFound("Senior not found");
        }

        return Ok(new { username = user.Username, photoUrl = user.PhotoUrl });
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto registerDto) 
    {
        try
        {
            var result = await _authService.RegisterAsync(registerDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto loginDto)
    {
        try
        {
            var result = await _authService.LoginAsync(loginDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Unauthorized(ex.Message);
        }
    }
}
