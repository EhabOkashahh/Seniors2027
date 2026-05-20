using Microsoft.EntityFrameworkCore;
using Seniors2027.DAL.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;

namespace Seniors2027.API.Middleware;

public class AccountLockMiddleware
{
    private readonly RequestDelegate _next;

    public AccountLockMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        var user = context.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var userIdClaim = user.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("nameid")?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
        {
            await _next(context);
            return;
        }

        var isLocked = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.IsLocked)
            .FirstOrDefaultAsync(context.RequestAborted);

        if (isLocked)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await JsonSerializer.SerializeAsync(
                context.Response.Body,
                new { message = "This account is locked. Contact an admin." },
                cancellationToken: context.RequestAborted);
            return;
        }

        await _next(context);
    }
}
