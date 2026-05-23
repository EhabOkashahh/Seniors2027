using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using System.Text.Json;

namespace Seniors2027.BLL.Services;

public class AuthService(
    IUnitOfWork unitOfWork,
    IJwtService jwtService,
    IEmailService emailService,
    IJoinRequestService joinRequestService,
    IConfiguration configuration) : IAuthService
{
    private const int LoginOtpLifetimeMinutes = 20;
    private const int MaxSocialLinksCount = 8;
    private static readonly TimeSpan PendingApprovalOtpLifetime = TimeSpan.FromHours(6);

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

        var user = GetUserAuthSnapshot(email);

        if (user is { IsLocked: true })
        {
            throw new Exception("This account is locked. Contact an admin.");
        }

        var otp = GenerateOtp();
        await _emailService.SendOtpEmailAsync(email, otp);

        var userOtp = new UserOtp
        {
            OtpCode = otp,
            Email = email,
            UserId = user?.Id,
            ExpiryTime = DateTime.UtcNow.AddMinutes(LoginOtpLifetimeMinutes)
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

        var otpRecord = FindActiveOtp(email, otp);
        if (otpRecord == null)
        {
            throw new Exception("Invalid or expired OTP");
        }

        var user = GetUserAuthSnapshot(email);

        if (user == null)
        {
            if (otpRecord.ExpiryTime < DateTime.UtcNow.Add(PendingApprovalOtpLifetime))
            {
                otpRecord.ExpiryTime = DateTime.UtcNow.Add(PendingApprovalOtpLifetime);
                _unitOfWork.Repository<UserOtp>().Update(otpRecord);
                await _unitOfWork.CompleteAsync();
            }

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

        await MarkOtpAsUsedAsync(otpRecord);

        if (user is { IsLocked: true })
        {
            throw new Exception("This account is locked. Contact an admin.");
        }

        var currentRole = user.Role;
        if (_adminEmails.Contains(email) && currentRole != UserRole.Admin)
        {
            var persistedUser = _unitOfWork.Repository<User>().Find(u => u.Id == user.Id).FirstOrDefault();
            if (persistedUser != null)
            {
                persistedUser.Role = UserRole.Admin;
                _unitOfWork.Repository<User>().Update(persistedUser);
                await _unitOfWork.CompleteAsync();
                currentRole = UserRole.Admin;
            }
        }

        var tokenUser = new User
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Gender = user.Gender,
            Role = currentRole,
            PhotoUrl = user.PhotoUrl,
            Description = user.Description,
            SocialLinksJson = user.SocialLinksJson
        };

        return new AuthResponseDto
        {
            Status = AuthResultStatus.Authenticated,
            Message = "Authenticated successfully.",
            Username = user.Username,
            Token = _jwtService.CreateToken(tokenUser),
            Role = currentRole,
            PhotoUrl = user.PhotoUrl,
            Description = user.Description,
            ProfileCompletionRequired = IsProfileCompletionRequired(tokenUser)
        };
    }

    private UserAuthSnapshot? GetUserAuthSnapshot(string email)
    {
        try
        {
            return _unitOfWork.Repository<User>()
                .Find(u => u.Email.ToLower() == email)
                .Select(u => new UserAuthSnapshot
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    Gender = u.Gender,
                    Role = u.Role,
                    PhotoUrl = u.PhotoUrl,
                    Description = u.Description,
                    SocialLinksJson = u.SocialLinksJson,
                    IsLocked = u.IsLocked
                })
                .FirstOrDefault();
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid column name 'IsLocked'", StringComparison.OrdinalIgnoreCase))
        {
            return _unitOfWork.Repository<User>()
                .Find(u => u.Email.ToLower() == email)
                .Select(u => new UserAuthSnapshot
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    Gender = u.Gender,
                    Role = u.Role,
                    PhotoUrl = u.PhotoUrl,
                    Description = u.Description,
                    SocialLinksJson = u.SocialLinksJson,
                    IsLocked = false
                })
                .FirstOrDefault();
        }
    }

    private sealed class UserAuthSnapshot
    {
        public int Id { get; init; }
        public string Username { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public Gender Gender { get; init; }
        public UserRole Role { get; init; }
        public string? PhotoUrl { get; init; }
        public string? Description { get; init; }
        public string? SocialLinksJson { get; init; }
        public bool IsLocked { get; init; }
    }


    private UserOtp? FindActiveOtp(string email, string otp)
    {
        return _unitOfWork.Repository<UserOtp>()
            .Find(x =>
                x.Email.ToLower() == email
                && x.OtpCode == otp
                && x.IsUsed == false
                && x.ExpiryTime > DateTime.UtcNow
            )
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();
    }

    private async Task MarkOtpAsUsedAsync(UserOtp otpRecord)
    {
        otpRecord.IsUsed = true;

        _unitOfWork.Repository<UserOtp>().Update(otpRecord);
        await _unitOfWork.CompleteAsync();
    }

    public Task<bool> IsUsernameTakenAsync(string username, int? excludeUserId = null)
    {
        var trimmedUsername = username.Trim();
        if (string.IsNullOrWhiteSpace(trimmedUsername))
        {
            return Task.FromResult(false);
        }

        var normalized = trimmedUsername.ToLowerInvariant();
        var taken = _unitOfWork.Repository<User>()
            .Find(u => u.Username.ToLower() == normalized && (!excludeUserId.HasValue || u.Id != excludeUserId.Value))
            .Any();

        return Task.FromResult(taken);
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

        var taken = await IsUsernameTakenAsync(trimmedUsername, userId);
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

    public async Task<bool> UpdateSocialLinksAsync(int userId, IEnumerable<string>? links)
    {
        var user = _unitOfWork.Repository<User>().Find(u => u.Id == userId).FirstOrDefault();
        if (user == null) return false;

        var normalizedLinks = NormalizeSocialLinks(links);
        user.SocialLinksJson = normalizedLinks.Count == 0 ? null : JsonSerializer.Serialize(normalizedLinks);

        _unitOfWork.Repository<User>().Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    private static List<string> NormalizeSocialLinks(IEnumerable<string>? links)
    {
        if (links == null) return new List<string>();

        var normalized = new List<string>();
        foreach (var rawLink in links)
        {
            if (string.IsNullOrWhiteSpace(rawLink)) continue;

            var candidate = rawLink.Trim();
            if (!candidate.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                && !candidate.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                candidate = $"https://{candidate}";
            }

            if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) continue;
            if (!IsSupportedWebScheme(uri.Scheme)) continue;

            var normalizedUrl = uri.ToString();
            if (normalized.Any(existing => string.Equals(existing, normalizedUrl, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            normalized.Add(normalizedUrl);
            if (normalized.Count >= MaxSocialLinksCount) break;
        }

        return normalized;
    }

    private static bool IsSupportedWebScheme(string scheme)
    {
        return string.Equals(scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || string.Equals(scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
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
