using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;

namespace Seniors2027.BLL.Services;

public class AuthService(
    IUnitOfWork unitOfWork,
    IJwtService jwtService,
    IEmailService emailService,
    IJoinRequestService joinRequestService,
    IConfiguration configuration) : IAuthService
{
    // public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    // {
    //     var existingUser = _unitOfWork.Repository<User>().Find(u => u.Username.ToLower() == registerDto.Username.ToLower()).FirstOrDefault();
    //     if (existingUser != null)
    //     {
    //         throw new Exception("Username is already taken");
    //     }

    //     var user = new User
    //     {
    //         Username = registerDto.Username.Trim(),
    //         PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
    //         Gender = registerDto.Gender,
    //         PhotoUrl = string.IsNullOrWhiteSpace(registerDto.PhotoUrl) ? "/favicon.svg" : registerDto.PhotoUrl
    //     };

    //     await _unitOfWork.Repository<User>().AddAsync(user);
    //     await _unitOfWork.CompleteAsync();

    //     return new AuthResponseDto
    //     {
    //         Username = user.Username,
    //         Token = _jwtService.CreateToken(user),
    //         PhotoUrl = user.PhotoUrl,
    //         Description = user.Description
    //     };
    // }

    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IJwtService _jwtService = jwtService;
    private readonly IEmailService _emailService = emailService;
    private readonly IJoinRequestService _joinRequestService = joinRequestService;
    private readonly HashSet<string> _adminEmails = configuration
        .GetSection("Authorization:AdminEmails")
        .GetChildren()
        .Select(x => x.Value ?? string.Empty)
        .Select(x => x.Trim().ToLowerInvariant())
        .Where(x => !string.IsNullOrWhiteSpace(x))
        .ToHashSet();

    public async Task<LoginStartResponseDto> LoginAsync(LoginDto loginDto)
    {
        var email = loginDto.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new Exception("Email is required");
        }

        var user = _unitOfWork.Repository<User>()
            .Find(u => u.Email.ToLower() == email)
            .FirstOrDefault();

        var otp = GenerateOtp();
        await _emailService.SendOtpEmailAsync(email, otp);

        var userOtp = new UserOtp
        {
            OtpCode = otp,
            Email = email,
            UserId = user?.Id,
            ExpiryTime = DateTime.UtcNow.AddMinutes(5)
        };

        await _unitOfWork.Repository<UserOtp>().AddAsync(userOtp);
        await _unitOfWork.CompleteAsync();

        return new LoginStartResponseDto
        {
            Message = "OTP sent successfully."
        };
    }

    public async Task<AuthResponseDto> VerifyOtpAsync(VerifyOtpDto verifyOtpDto)
    {
        var email = verifyOtpDto.Email.Trim().ToLowerInvariant();
        var otp = verifyOtpDto.Otp.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new Exception("Email is required");
        }

        if (string.IsNullOrWhiteSpace(otp))
        {
            throw new Exception("OTP is required");
        }

        var res = await ConsumeOtpAsync(email, otp);
        if (!res)
        {
            throw new Exception("Invalid or expired OTP");
        }

        var user = _unitOfWork.Repository<User>()
            .Find(u => u.Email.ToLower() == email)
            .FirstOrDefault();

        if (user == null)
        {
            await _joinRequestService.EnsurePendingRequestAsync(email);
            return new AuthResponseDto
            {
                Status = AuthResultStatus.PendingApproval,
                Message = "Your join request is pending approval.",
                Token = null,
                Username = null,
                Role = null,
                PhotoUrl = null,
                Description = null,
                ProfileCompletionRequired = false
            };
        }

        if (_adminEmails.Contains(email) && user.Role != UserRole.Admin)
        {
            user.Role = UserRole.Admin;
            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();
        }

        return new AuthResponseDto
        {
            Status = AuthResultStatus.Authenticated,
            Message = "Authenticated successfully.",
            Username = user.Username,
            Token = _jwtService.CreateToken(user),
            Role = user.Role,
            PhotoUrl = user.PhotoUrl,
            Description = user.Description,
            ProfileCompletionRequired = IsProfileCompletionRequired(user)
        };
    }


    private async Task<bool> ConsumeOtpAsync(string email, string otp)
    {
        var otpRecord = _unitOfWork.Repository<UserOtp>()
            .Find(x =>
                x.Email.ToLower() == email.ToLower()
                && x.OtpCode == otp
                && x.IsUsed == false
                && x.ExpiryTime > DateTime.UtcNow
            )
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

        if (otpRecord == null)
        {
            return false;
        }

        otpRecord.IsUsed = true;

        _unitOfWork.Repository<UserOtp>().Update(otpRecord);
        await _unitOfWork.CompleteAsync();

        return true;
    }

    public async Task<bool> UpdateUsernameAsync(int userId, string username)
    {
        var trimmedUsername = username.Trim();
        if (string.IsNullOrWhiteSpace(trimmedUsername))
        {
            throw new Exception("Username is required");
        }

        var user = _unitOfWork.Repository<User>().Find(u => u.Id == userId).FirstOrDefault();
        if (user == null) return false;

        var taken = _unitOfWork.Repository<User>()
            .Find(u => u.Id != userId && u.Username.ToLower() == trimmedUsername.ToLower())
            .Any();
        if (taken)
        {
            throw new Exception("Username is already taken");
        }

        user.Username = trimmedUsername;
        _unitOfWork.Repository<User>().Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UpdateGenderAsync(int userId, Gender gender)
    {
        var user = _unitOfWork.Repository<User>().Find(u => u.Id == userId).FirstOrDefault();
        if (user == null) return false;

        user.Gender = gender;
        _unitOfWork.Repository<User>().Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UpdateDescriptionAsync(int userId, string? description)
    {
        var user = _unitOfWork.Repository<User>().Find(u => u.Id == userId).FirstOrDefault();
        if (user == null) return false;

        user.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        _unitOfWork.Repository<User>().Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    private string GenerateOtp()
    {
        return RandomNumberGenerator
            .GetInt32(100000, 999999)
            .ToString();
    }

    private static bool IsProfileCompletionRequired(User user)
    {
        var hasUsername = !string.IsNullOrWhiteSpace(user.Username);
        var hasPhoto = !string.IsNullOrWhiteSpace(user.PhotoUrl);
        var hasGender = user.Gender != Gender.Unknown;
        return !(hasUsername && hasPhoto && hasGender);
    }
}
