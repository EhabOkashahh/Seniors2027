using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Interfaces;

public interface IAuthService
{
    Task<LoginStartResponseDto> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto> VerifyOtpAsync(VerifyOtpDto verifyOtpDto);
    Task<bool> IsUsernameTakenAsync(string username, int? excludeUserId = null);
    Task<bool> UpdateUsernameAsync(int userId, string username);
    Task<bool> UpdateGenderAsync(int userId, Gender gender);
    Task<bool> UpdateDescriptionAsync(int userId, string? description);
    Task<bool> UpdateSocialLinksAsync(int userId, IEnumerable<string>? links);
    Task<bool> UpdateFavoriteSongEmbedUrlAsync(int userId, string? favoriteSongEmbedUrl);
}
