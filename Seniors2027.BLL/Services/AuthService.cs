using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using Seniors2027.DAL.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Seniors2027.BLL.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;

    public AuthService(IUnitOfWork unitOfWork, IJwtService jwtService)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        var existingUser = _unitOfWork.Repository<User>().Find(u => u.Username.ToLower() == registerDto.Username.ToLower()).FirstOrDefault();
        if (existingUser != null)
        {
            throw new Exception("Username is already taken");
        }

        var user = new User
        {
            Username = registerDto.Username.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
            Gender = registerDto.Gender,
            PhotoUrl = string.IsNullOrWhiteSpace(registerDto.PhotoUrl) ? "/favicon.svg" : registerDto.PhotoUrl
        };

        await _unitOfWork.Repository<User>().AddAsync(user);
        await _unitOfWork.CompleteAsync();

        return new AuthResponseDto
        {
            Username = user.Username,
            Token = _jwtService.CreateToken(user),
            PhotoUrl = user.PhotoUrl,
            Description = user.Description
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = _unitOfWork.Repository<User>().Find(u => u.Username.ToLower() == loginDto.Username.ToLower()).FirstOrDefault();

        if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
        {
            throw new Exception("Invalid username or password");
        }

        return new AuthResponseDto
        {
            Username = user.Username,
            Token = _jwtService.CreateToken(user),
            PhotoUrl = user.PhotoUrl,
            Description = user.Description
        };
    }

    public async Task<bool> UpdateDescriptionAsync(string username, string? description)
    {
        var user = _unitOfWork.Repository<User>().Find(u => u.Username.ToLower() == username.ToLower()).FirstOrDefault();
        if (user == null) return false;

        user.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        _unitOfWork.Repository<User>().Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }
}
