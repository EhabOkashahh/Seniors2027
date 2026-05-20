using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Seniors2027.API.Middleware;

public sealed class ErrorMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorMiddleware> _logger;

    public ErrorMiddleware(RequestDelegate next, ILogger<ErrorMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
            await WriteStatusCodeResponseIfNeededAsync(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogError(ex, "Unhandled exception after response started.");
            throw;
        }

        var (statusCode, message) = ex switch
        {
            BadHttpRequestException badRequest => (badRequest.StatusCode, "Bad request."),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized."),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource not found."),
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid request data."),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "Operation is not valid for this request."),
            TimeoutException => (StatusCodes.Status503ServiceUnavailable, "Service temporarily unavailable. Please retry."),
            _ => (StatusCodes.Status500InternalServerError, "Unexpected server error. Please try again.")
        };

        _logger.LogError(ex, "Request failed with status code {StatusCode}. Path: {Path}", statusCode, context.Request.Path);
        await WriteErrorResponseAsync(context, statusCode, message);
    }

    private static async Task WriteStatusCodeResponseIfNeededAsync(HttpContext context)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        var statusCode = context.Response.StatusCode;
        if (statusCode < 400)
        {
            return;
        }

        if (context.Response.ContentLength.HasValue && context.Response.ContentLength.Value > 0)
        {
            return;
        }

        if (!string.IsNullOrWhiteSpace(context.Response.ContentType))
        {
            return;
        }

        var message = statusCode switch
        {
            StatusCodes.Status400BadRequest => "Bad request.",
            StatusCodes.Status401Unauthorized => "Unauthorized.",
            StatusCodes.Status403Forbidden => "You don't have permission to access this resource.",
            StatusCodes.Status404NotFound => "Resource not found.",
            StatusCodes.Status405MethodNotAllowed => "HTTP method is not allowed for this endpoint.",
            StatusCodes.Status409Conflict => "Request conflicts with current server state.",
            StatusCodes.Status415UnsupportedMediaType => "Unsupported media type.",
            StatusCodes.Status422UnprocessableEntity => "Validation failed.",
            StatusCodes.Status429TooManyRequests => "Too many requests. Please wait and retry.",
            StatusCodes.Status500InternalServerError => "Unexpected server error. Please try again.",
            StatusCodes.Status502BadGateway => "Bad gateway.",
            StatusCodes.Status503ServiceUnavailable => "Service temporarily unavailable. Please retry.",
            StatusCodes.Status504GatewayTimeout => "Gateway timeout.",
            _ => $"Request failed with status code {statusCode}."
        };

        await WriteErrorResponseAsync(context, statusCode, message);
    }

    private static Task WriteErrorResponseAsync(HttpContext context, int statusCode, string message)
    {
        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = new ErrorPayload(
            Success: false,
            StatusCode: statusCode,
            Message: message,
            Path: context.Request.Path.Value ?? string.Empty,
            TraceId: context.TraceIdentifier,
            TimestampUtc: DateTimeOffset.UtcNow);

        return context.Response.WriteAsJsonAsync(payload);
    }

    private sealed record ErrorPayload(
        bool Success,
        int StatusCode,
        string Message,
        string Path,
        string TraceId,
        DateTimeOffset TimestampUtc);
}
