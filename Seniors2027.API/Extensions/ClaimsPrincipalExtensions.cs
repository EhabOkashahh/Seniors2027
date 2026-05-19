using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Seniors2027.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal principal, out int userId)
    {
        userId = 0;
        var userIdClaim = principal.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst("nameid")?.Value;

        return int.TryParse(userIdClaim, out userId);
    }
}
