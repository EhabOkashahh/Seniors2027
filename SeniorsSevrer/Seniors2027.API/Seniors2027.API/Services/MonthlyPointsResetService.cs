using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.Interfaces;
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
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var nextRun = now.Date.AddDays(1).AddHours(2);
                var delay = nextRun - now;

                if (delay.TotalMilliseconds > 0)
                {
                    await Task.Delay(delay, stoppingToken);
                }

                now = DateTime.UtcNow;
                if (now.Day == 1)
                {
                    await ExecuteMonthlyResetAsync(stoppingToken);
                }
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

    private async Task ExecuteMonthlyResetAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<IAppUpdatesRealtimeNotifier>();

        var previousMonth = DateTime.UtcNow.AddMonths(-1);
        var year = previousMonth.Year;
        var month = previousMonth.Month;

        var alreadyExists = await context.MonthlyTopThree
            .AnyAsync(x => x.Year == year && x.Month == month, stoppingToken);

        if (!alreadyExists)
        {
            var topUsers = await context.Users
                .OrderByDescending(u => u.Points)
                .ThenBy(u => u.Username)
                .Take(3)
                .ToListAsync(stoppingToken);

            if (topUsers.Count > 0)
            {
                var snapshot = new MonthlyTopThree
                {
                    Year = year,
                    Month = month,
                    CreatedAtUtc = DateTime.UtcNow
                };

                if (topUsers.Count >= 1)
                {
                    snapshot.Rank1UserId = topUsers[0].Id;
                    snapshot.Rank1Username = topUsers[0].Username;
                    snapshot.Rank1PhotoUrl = topUsers[0].PhotoUrl;
                    snapshot.Rank1Points = topUsers[0].Points;
                }

                if (topUsers.Count >= 2)
                {
                    snapshot.Rank2UserId = topUsers[1].Id;
                    snapshot.Rank2Username = topUsers[1].Username;
                    snapshot.Rank2PhotoUrl = topUsers[1].PhotoUrl;
                    snapshot.Rank2Points = topUsers[1].Points;
                }

                if (topUsers.Count >= 3)
                {
                    snapshot.Rank3UserId = topUsers[2].Id;
                    snapshot.Rank3Username = topUsers[2].Username;
                    snapshot.Rank3PhotoUrl = topUsers[2].PhotoUrl;
                    snapshot.Rank3Points = topUsers[2].Points;
                }

                context.MonthlyTopThree.Add(snapshot);
                await context.SaveChangesAsync(stoppingToken);

                _logger.LogInformation(
                    "Saved monthly top-three snapshot for {Year}-{Month}: #1 {U1} ({P1}pts), #2 {U2} ({P2}pts), #3 {U3} ({P3}pts).",
                    year, month,
                    snapshot.Rank1Username, snapshot.Rank1Points,
                    snapshot.Rank2Username, snapshot.Rank2Points,
                    snapshot.Rank3Username, snapshot.Rank3Points);
            }
        }
        else
        {
            _logger.LogInformation("Snapshot for {Year}-{Month} already exists. Skipping save.", year, month);
        }

        var userIds = await context.Users.Select(u => u.Id).ToListAsync(stoppingToken);

        await context.Users
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.Points, 0), stoppingToken);

        _logger.LogInformation("Reset points to 0 for all {UserCount} users.", userIds.Count);

        foreach (var userId in userIds)
        {
            await notifier.NotifyUserPointsUpdatedAsync(userId, 0, stoppingToken);
        }
    }
}
