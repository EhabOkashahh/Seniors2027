using Seniors2027.BLL.DTOs;

namespace Seniors2027.BLL.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    Task<bool> UpdateDescriptionAsync(string username, string? description);
}
