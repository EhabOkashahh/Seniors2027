using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;
using System.Security.Cryptography;

namespace Seniors2027.BLL.Services;

public class AuthService(IUnitOfWork _unitOfWork, IJwtService _jwtService, IEmailService _emailService) : IAuthService
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

    public async Task<LoginStartResponseDto> LoginAsync(LoginDto loginDto)
    {
        var email = loginDto.Email.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new Exception("Email is required");
        }

        var user = _unitOfWork.Repository<User>().Find(u => u.Email.ToLower() == email.ToLower()).FirstOrDefault();

        if (user == null)
        {
            throw new Exception("Invalid email");
        }

        var otp = GenerateOtp();
        await _emailService.SendOtpEmailAsync(email, otp);

        var userOtp = new UserOtp
        {
            OtpCode = otp,
            Email = email,
            userId = user.Id,
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
        var email = verifyOtpDto.Email.Trim();
        var otp = verifyOtpDto.Otp.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new Exception("Email is required");
        }

        if (string.IsNullOrWhiteSpace(otp))
        {
            throw new Exception("OTP is required");
        }

        var user = _unitOfWork.Repository<User>()
            .Find(u => u.Email.ToLower() == email.ToLower())
            .FirstOrDefault();

        if (user == null)
        {
            throw new Exception("Invalid email");
        }

        var res = await ConsumeOtpAsync(email, otp);
        if (!res)
        {
            throw new Exception("Invalid or expired OTP");
        }

        return new AuthResponseDto
        {
            Username = user.Username,
            Token = _jwtService.CreateToken(user),
            PhotoUrl = user.PhotoUrl,
            Description = user.Description
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
}
