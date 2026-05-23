using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;
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

var builder = WebApplication.CreateBuilder(args);

bool IsAllowedClientOrigin(string? origin)
{
    if (string.IsNullOrWhiteSpace(origin)) return false;

    if (origin.Equals("http://localhost:5173", StringComparison.OrdinalIgnoreCase) ||
        origin.Equals("http://localhost:5174", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

    var host = uri.Host;
    return uri.Scheme == Uri.UriSchemeHttps &&
           (host.Equals("seniors2027.vercel.app", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("seniors2027-dh5g55hvy-okashahehab-6438s-projects.vercel.app", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("vercel.app", StringComparison.OrdinalIgnoreCase));
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
builder.Services.AddScoped<IEmailService, EmailService >();
builder.Services.AddSingleton<IDailyHighlightsRealtimeNotifier, DailyHighlightsRealtimeNotifier>();
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
                    requestPath.StartsWithSegments(DailyHighlightsHub.RoutePath))
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
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
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
        context.Context.Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
    }
});

app.UseAuthentication();
app.UseMiddleware<AccountLockMiddleware>();
app.UseAuthorization();

app.MapHub<DailyHighlightsHub>(DailyHighlightsHub.Route);
app.MapControllers();

app.Run();
