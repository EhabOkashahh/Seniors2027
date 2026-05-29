using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;
using Seniors2027.API.Hubs;
using Seniors2027.API.Middleware;
using Seniors2027.BLL.Interfaces;
using Seniors2027.BLL.Services;
using Seniors2027.API.Services;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Interfaces;
using Seniors2027.DAL.Repositories;
using System.Text;
using System.Text.Json.Serialization;
using Scalar.AspNetCore;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"] ?? "";
var knownInsecureKeys = new[]
{
    "ThisIsAVeryLongAndSecureSecretKeyThatIsAtLeast64CharactersLongForHMACSHA512",
    "",
};
if (knownInsecureKeys.Contains(jwtKey))
{
    throw new InvalidOperationException(
        "JWT signing key is not configured. Set the Jwt__Key environment variable or configure it in production. " +
        "The default/insecure key is not allowed in production.");
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Database connection string is not configured. Set the ConnectionStrings__DefaultConnection environment variable.");
}

bool IsAllowedClientOrigin(string? origin)
{
    if (string.IsNullOrWhiteSpace(origin)) return false;

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

    var isLocalhost = uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || uri.Host.Equals("::1", StringComparison.OrdinalIgnoreCase);

    if (isLocalhost &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
    {
        return true;
    }

    return uri.Scheme == Uri.UriSchemeHttps &&
           (uri.Host.Equals("seniors2027.vercel.app", StringComparison.OrdinalIgnoreCase) ||
            uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase));
}

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IJoinRequestService, JoinRequestService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<IGalleryService, GalleryService>();
builder.Services.AddScoped<IDailyHighlightService, DailyHighlightService>();
builder.Services.AddScoped<IImageUploadProcessor, ImageUploadProcessor>();
builder.Services.AddScoped<IChallengeMediaUploadProcessor, ChallengeMediaUploadProcessor>();
builder.Services.AddScoped<IChallengeService, ChallengeService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IEmailService, EmailService >();
builder.Services.AddSingleton<IDailyHighlightsRealtimeNotifier, DailyHighlightsRealtimeNotifier>();
builder.Services.AddSingleton<IAnnouncementPollRealtimeNotifier, AnnouncementPollRealtimeNotifier>();
builder.Services.AddSingleton<IAppUpdatesRealtimeNotifier, AppUpdatesRealtimeNotifier>();
builder.Services.AddHttpClient();
builder.Services.AddSignalR();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "")),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var requestPath = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) &&
                    (requestPath.StartsWithSegments(DailyHighlightsHub.RoutePath) ||
                     requestPath.StartsWithSegments(AnnouncementPollsHub.RoutePath) ||
                     requestPath.StartsWithSegments(AppUpdatesHub.RoutePath) ||
                     requestPath.StartsWithSegments("/hubs/challenge-chat")))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.SetIsOriginAllowed(IsAllowedClientOrigin)
              .WithHeaders("Content-Type", "Authorization", "X-Requested-With", "X-SignalR-User-Agent")
              .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
              .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("AuthLogin", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(15);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("AuthVerifyOtp", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(15);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi("v1");

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("StartupMigration");

    try
    {
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database migration failed during startup.");
    }
}

app.UseMiddleware<ErrorMiddleware>();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    context.Response.Headers["X-XSS-Protection"] = "0";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Seniors 2027 API")
               .WithTheme(ScalarTheme.Moon)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.UseRateLimiter();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowReactApp");

var photosDirectory = Path.Combine(app.Environment.ContentRootPath, "SeniorsPhotos");
Directory.CreateDirectory(photosDirectory);
await LegacyPhotoNormalizer.NormalizeToWebpAsync(photosDirectory);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(photosDirectory),
    RequestPath = "/SeniorsPhotos",
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        context.Context.Response.Headers["Cross-Origin-Resource-Policy"] = "*";
    }
});

var challengeMediaDirectory = Path.Combine(app.Environment.ContentRootPath, "ChallengeMedia");
Directory.CreateDirectory(challengeMediaDirectory);
var challengeMediaContentTypeProvider = new FileExtensionContentTypeProvider();
challengeMediaContentTypeProvider.Mappings.Clear();
challengeMediaContentTypeProvider.Mappings[".jpg"] = "image/jpeg";
challengeMediaContentTypeProvider.Mappings[".jpeg"] = "image/jpeg";
challengeMediaContentTypeProvider.Mappings[".png"] = "image/png";
challengeMediaContentTypeProvider.Mappings[".gif"] = "image/gif";
challengeMediaContentTypeProvider.Mappings[".webp"] = "image/webp";
challengeMediaContentTypeProvider.Mappings[".mp4"] = "video/mp4";
challengeMediaContentTypeProvider.Mappings[".pdf"] = "application/pdf";
challengeMediaContentTypeProvider.Mappings[".mp3"] = "audio/mpeg";
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(challengeMediaDirectory),
    RequestPath = "/ChallengeMedia",
    ContentTypeProvider = challengeMediaContentTypeProvider,
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        context.Context.Response.Headers["Cross-Origin-Resource-Policy"] = "*";
        context.Context.Response.Headers["Content-Disposition"] = "inline";
    }
});

app.UseAuthentication();
app.UseMiddleware<AccountLockMiddleware>();
app.UseAuthorization();

app.MapHub<DailyHighlightsHub>(DailyHighlightsHub.Route);
app.MapHub<AnnouncementPollsHub>(AnnouncementPollsHub.Route);
app.MapHub<AppUpdatesHub>(AppUpdatesHub.Route);
app.MapHub<ChallengeChatHub>("/hubs/challenge-chat");
app.MapControllers();

app.Run();
