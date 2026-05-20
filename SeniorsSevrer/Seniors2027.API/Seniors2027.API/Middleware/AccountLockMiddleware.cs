using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
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

        bool isLocked;
        try
        {
            isLocked = await dbContext.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.IsLocked)
                .FirstOrDefaultAsync(context.RequestAborted);
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid column name 'IsLocked'", StringComparison.OrdinalIgnoreCase))
        {
            // Backward-compatible fallback while pending migrations are being applied.
            await _next(context);
            return;
        }

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
