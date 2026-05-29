using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Seniors2027.BLL.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;
    private readonly SymmetricSecurityKey _key;

    public JwtService(IConfiguration config)
    {
        _config = config;
        var tokenKey = _config["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key is missing");
        if (string.IsNullOrWhiteSpace(tokenKey) || tokenKey == "ThisIsAVeryLongAndSecureSecretKeyThatIsAtLeast64CharactersLongForHMACSHA512")
        {
            throw new InvalidOperationException("JWT signing key is not configured or is using the default insecure key. Set the Jwt__Key environment variable.");
        }
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
    }

    public string CreateToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.NameId, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("role", user.Role.ToString())
        };

        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(14),
            SigningCredentials = creds,
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
