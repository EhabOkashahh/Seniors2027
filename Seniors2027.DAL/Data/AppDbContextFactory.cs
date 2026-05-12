using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System.Text.Json;

namespace Seniors2027.DAL.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var currentDir = Directory.GetCurrentDirectory();
        var apiDir = Path.Combine(currentDir, "..", "Seniors2027.API");
        var appSettingsInCurrent = Path.Combine(currentDir, "appsettings.json");
        var appSettingsInApi = Path.Combine(apiDir, "appsettings.json");
        var appSettingsPath = File.Exists(appSettingsInCurrent) ? appSettingsInCurrent : appSettingsInApi;

        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString) && File.Exists(appSettingsPath))
        {
            using var json = JsonDocument.Parse(File.ReadAllText(appSettingsPath));
            if (json.RootElement.TryGetProperty("ConnectionStrings", out var connectionStrings) &&
                connectionStrings.TryGetProperty("DefaultConnection", out var defaultConnection))
            {
                connectionString = defaultConnection.GetString();
            }
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
