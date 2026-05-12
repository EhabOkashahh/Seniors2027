using System.ComponentModel.DataAnnotations;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.DTOs;

public class RegisterDto
{
    public required string Username { get; set; }
    public required string Password { get; set; }
    public required Gender Gender { get; set; }
    public string? PhotoUrl { get; set; }
}

public class LoginDto
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}

public class AuthResponseDto
{
    public required string Username { get; set; }
    public required string Token { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Description { get; set; }
}

public class UpdateDescriptionDto
{
    public string? Description { get; set; }
}
