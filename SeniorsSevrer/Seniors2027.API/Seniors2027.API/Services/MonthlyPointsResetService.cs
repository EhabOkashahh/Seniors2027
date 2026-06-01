using Microsoft.EntityFrameworkCore;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.API.Services;

public class MonthlyPointsResetService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MonthlyPointsResetService> _logger;

    public MonthlyPointsResetService(
        IServiceScopeFactory scopeFactory,
        ILogger<MonthlyPointsResetService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var initialNow = DateTime.UtcNow;
        var initialDelay = initialNow.Date.AddDays(1).AddHours(2) - initialNow;
        if (initialDelay.TotalMilliseconds > 0)
        {
            try
            {
                await Task.Delay(initialDelay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;

                if (now.Day == 1)
                {
                    await ResetPointsAsync(stoppingToken);
                }

                var nextRun = now.Date.AddDays(1).AddHours(2);
                var delay = nextRun - now;

                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in monthly points reset service.");
            }
        }
    }

    private async Task ResetPointsAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var previousMonth = DateTime.UtcNow.AddMonths(-1);
        var year = previousMonth.Year;
        var month = previousMonth.Month;

        try
        {
            var alreadySaved = await context.MonthlyTopThree
                .AnyAsync(x => x.Year == year && x.Month == month, stoppingToken);

            if (!alreadySaved)
            {
                var top = await context.Users
                    .AsNoTracking()
                    .OrderByDescending(u => u.Points)
                    .ThenBy(u => u.Username)
                    .Take(3)
                    .ToListAsync(stoppingToken);

                if (top.Count > 0)
                {
                    var snap = new MonthlyTopThree
                    {
                        Year = year,
                        Month = month,
                        CreatedAtUtc = DateTime.UtcNow,
                        Rank1UserId = top[0].Id,
                        Rank1Username = top[0].Username,
                        Rank1PhotoUrl = top[0].PhotoUrl,
                        Rank1Points = top[0].Points
                    };

                    if (top.Count >= 2)
                    {
                        snap.Rank2UserId = top[1].Id;
                        snap.Rank2Username = top[1].Username;
                        snap.Rank2PhotoUrl = top[1].PhotoUrl;
                        snap.Rank2Points = top[1].Points;
                    }

                    if (top.Count >= 3)
                    {
                        snap.Rank3UserId = top[2].Id;
                        snap.Rank3Username = top[2].Username;
                        snap.Rank3PhotoUrl = top[2].PhotoUrl;
                        snap.Rank3Points = top[2].Points;
                    }

                    context.MonthlyTopThree.Add(snap);
                    await context.SaveChangesAsync(stoppingToken);

                    _logger.LogInformation(
                        "Saved top-3 snapshot for {Y}-{M}: #1 {U1} ({P1}), #2 {U2} ({P2}), #3 {U3} ({P3})",
                        year, month,
                        snap.Rank1Username, snap.Rank1Points,
                        snap.Rank2Username, snap.Rank2Points,
                        snap.Rank3Username, snap.Rank3Points);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to save monthly top-3 snapshot (table may not exist). Resetting points anyway.");
        }

        var totalAffected = 0;
        int batchAffected;
        do
        {
            batchAffected = await context.Database
                .ExecuteSqlRawAsync("UPDATE TOP (500) [Users] SET [Points] = 0 WHERE [Points] <> 0", stoppingToken);
            totalAffected += batchAffected;
        } while (batchAffected > 0);

        _logger.LogInformation("Reset points to 0 for {Count} users ({Y}-{M}).", totalAffected, year, month);
    }
}
