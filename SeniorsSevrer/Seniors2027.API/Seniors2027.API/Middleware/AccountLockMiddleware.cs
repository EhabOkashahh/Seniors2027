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

        AccountState? accountState;
        try
        {
            accountState = await dbContext.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new AccountState
                {
                    IsLocked = u.IsLocked
                })
                .FirstOrDefaultAsync(context.RequestAborted);
        }
        catch (SqlException ex) when (ex.Message.Contains("Invalid column name 'IsLocked'", StringComparison.OrdinalIgnoreCase))
        {
            // Backward-compatible fallback while pending migrations are being applied.
            await _next(context);
            return;
        }

        if (accountState is null)
        {
            await WriteForcedLogoutResponse(
                context,
                message: "Your account no longer exists. You have been logged out.",
                code: "ACCOUNT_DELETED");
            return;
        }

        if (accountState.IsLocked)
        {
            await WriteForcedLogoutResponse(
                context,
                message: "Your account has been locked. You have been logged out.",
                code: "ACCOUNT_LOCKED");
            return;
        }

        await _next(context);
    }

    private static async Task WriteForcedLogoutResponse(HttpContext context, string message, string code)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";
        context.Response.Headers["X-Session-Invalidated"] = "true";
        context.Response.Headers["X-Session-Invalidation-Code"] = code;
        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            new
            {
                code,
                message
            },
            cancellationToken: context.RequestAborted);
    }

    private sealed class AccountState
    {
        public bool IsLocked { get; init; }
    }
}
