using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;
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
        policy.SetIsOriginAllowed(origin =>
              {
                  if (string.IsNullOrWhiteSpace(origin)) return false;

                  if (origin.Equals("http://localhost:5173", StringComparison.OrdinalIgnoreCase) ||
                      origin.Equals("http://localhost:5174", StringComparison.OrdinalIgnoreCase))
                  {
                      return true;
                  }

                  if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

                  return uri.Scheme == Uri.UriSchemeHttps &&
                         (uri.Host.Equals("seniors2027-dh5g55hvy-okashahehab-6438s-projects.vercel.app", StringComparison.OrdinalIgnoreCase) ||
                          uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase));
              })
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseMiddleware<ErrorMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var photosDirectory = Path.Combine(app.Environment.ContentRootPath, "SeniorsPhotos");
Directory.CreateDirectory(photosDirectory);
await LegacyPhotoNormalizer.NormalizeToWebpAsync(photosDirectory);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(photosDirectory),
    RequestPath = "/SeniorsPhotos"
});

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
