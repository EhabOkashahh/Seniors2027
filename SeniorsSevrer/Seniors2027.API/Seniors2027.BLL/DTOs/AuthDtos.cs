using System.ComponentModel.DataAnnotations;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.DTOs;

public class LoginDto
{
    public required string Email { get; set; }
}

public class VerifyOtpDto
{
    public required string Email { get; set; }
    public required string Otp { get; set; }
}

public class LoginStartResponseDto
{
    public required string Message { get; set; }
}

public class AuthResponseDto
{
    public required AuthResultStatus Status { get; set; }
    public string? Message { get; set; }
    public string? Username { get; set; }
    public string? Token { get; set; }
    public UserRole? Role { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Description { get; set; }
    public bool ProfileCompletionRequired { get; set; }
}

public enum AuthResultStatus
{
    Authenticated = 0,
    PendingApproval = 1
}

public class UpdateDescriptionDto
{
    public string? Description { get; set; }
}

public class UpdateSocialLinksDto
{
    public List<string>? Links { get; set; }
}

public class UpdateUsernameDto
{
    public required string Username { get; set; }
}

public class UpdateGenderDto
{
    public required Gender Gender { get; set; }
}
