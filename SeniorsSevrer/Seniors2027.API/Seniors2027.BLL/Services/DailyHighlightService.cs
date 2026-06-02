using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class DailyHighlightService : IDailyHighlightService
{
    private const int HighlightPointsAward = 2;
    private readonly AppDbContext _context;
    private readonly IAppUpdatesRealtimeNotifier _appUpdatesRealtimeNotifier;
    private readonly INotificationService _notificationService;

    public DailyHighlightService(AppDbContext context, IAppUpdatesRealtimeNotifier appUpdatesRealtimeNotifier, INotificationService notificationService)
    {
        _context = context;
        _appUpdatesRealtimeNotifier = appUpdatesRealtimeNotifier;
        _notificationService = notificationService;
    }

    public async Task<DailyHighlightDto> AddHighlightAsync(int userId, string photoUrl, IReadOnlyCollection<int>? mentionUserIds = null)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new InvalidOperationException("User not found.");

        var now = DateTime.UtcNow;

        var galleryPhoto = new GalleryPhoto
        {
            UserId = userId,
            PhotoUrl = photoUrl,
            CreatedAt = now
        };

        var highlight = new DailyHighlight
        {
            UserId = userId,
            GalleryPhoto = galleryPhoto,
            CreatedAt = now,
            ExpiresAt = now.AddHours(24)
        };

        var normalizedMentionIds = mentionUserIds?
            .Where(id => id > 0 && id != userId)
            .Distinct()
            .ToList() ?? new List<int>();

        if (normalizedMentionIds.Count > 0)
        {
            var mentionedUsers = await _context.Users
                .Where(u => normalizedMentionIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync();

            if (mentionedUsers.Count != normalizedMentionIds.Count)
            {
                throw new InvalidOperationException("One or more mentioned users were not found.");
            }

            foreach (var mentionedUserId in normalizedMentionIds)
            {
                highlight.Mentions.Add(new DailyHighlightMention
                {
                    MentionedUserId = mentionedUserId,
                    CreatedAt = now
                });
            }
        }

        await _context.DailyHighlights.AddAsync(highlight);
        user.Points += HighlightPointsAward;
        await _context.SaveChangesAsync();

        if (normalizedMentionIds.Count > 0)
        {
            foreach (var mentionedUserId in normalizedMentionIds)
            {
                await _notificationService.CreateNotificationAsync(
                    mentionedUserId,
                    "highlight_mention",
                    $"{user.Username} mentioned you in a highlight",
                    $"/portal?highlight={highlight.Id}",
                    userId);
            }
        }

        await _appUpdatesRealtimeNotifier.NotifyUserPointsUpdatedAsync(user.Id, user.Points);

        var createdHighlight = await QueryHighlightsWithRelations()
            .FirstOrDefaultAsync(h => h.Id == highlight.Id);

        return createdHighlight == null
            ? throw new InvalidOperationException("Could not load created highlight.")
            : MapToDto(createdHighlight, userId);
    }

    public async Task<IReadOnlyList<DailyHighlightDto>> GetActiveHighlightsAsync(int maxCount, int? requesterUserId = null)
    {
        var now = DateTime.UtcNow;

        IQueryable<DailyHighlight> query = QueryHighlightsWithRelations()
            .Where(h => h.ExpiresAt > now)
            .OrderByDescending(h => h.CreatedAt);

        if (maxCount > 0)
        {
            query = query.Take(maxCount);
        }

        var highlights = await query.ToListAsync();

        return highlights.Select(h => MapToDto(h, requesterUserId)).ToList();
    }

    public async Task<IReadOnlyList<DailyHighlightDto>> GetHighlightsArchiveAsync(int maxCount, int? requesterUserId = null)
    {
        var safeMax = maxCount < 1 ? 120 : Math.Min(maxCount, 1000);

        var highlights = await QueryHighlightsWithRelations()
            .OrderByDescending(h => h.CreatedAt)
            .Take(safeMax)
            .ToListAsync();

        return highlights.Select(h => MapToDto(h, requesterUserId)).ToList();
    }

    public async Task<DailyHighlightDto?> DeleteHighlightAsync(int highlightId, int requesterUserId, bool requesterIsAdmin = false)
    {
        var highlight = await QueryHighlightsWithRelations(asNoTracking: false)
            .FirstOrDefaultAsync(h => h.Id == highlightId);

        if (highlight == null) return null;
        if (!requesterIsAdmin && highlight.UserId != requesterUserId) return null;
        var shouldRevertPoints = DateTime.UtcNow < highlight.ExpiresAt;

        var deletedDto = MapToDto(highlight, requesterUserId);

        if (shouldRevertPoints)
        {
            highlight.User.Points = Math.Max(0, highlight.User.Points - HighlightPointsAward);
        }

        _context.DailyHighlights.Remove(highlight);
        _context.GalleryPhotos.Remove(highlight.GalleryPhoto);
        await _context.SaveChangesAsync();

        if (shouldRevertPoints)
        {
            await _appUpdatesRealtimeNotifier.NotifyUserPointsUpdatedAsync(highlight.User.Id, highlight.User.Points);
        }

        return deletedDto;
    }

    public async Task<DailyHighlightDto?> ToggleReactionAsync(int highlightId, int userId, DailyHighlightReactionType type)
    {
        var highlight = await QueryHighlightsWithRelations(asNoTracking: false)
            .Include(h => h.User)
            .FirstOrDefaultAsync(h => h.Id == highlightId);

        if (highlight == null) return null;

        var existingReaction = highlight.Reactions.FirstOrDefault(r => r.UserId == userId);
        var now = DateTime.UtcNow;
        var isNewReaction = false;

        if (existingReaction == null)
        {
            var reaction = new DailyHighlightReaction
            {
                DailyHighlightId = highlight.Id,
                UserId = userId,
                Type = type,
                CreatedAt = now
            };
            _context.DailyHighlightReactions.Add(reaction);
            isNewReaction = true;
        }
        else if (existingReaction.Type == type)
        {
            _context.DailyHighlightReactions.Remove(existingReaction);
        }
        else
        {
            existingReaction.Type = type;
            existingReaction.CreatedAt = now;
            isNewReaction = true;
        }

        await _context.SaveChangesAsync();

        if (isNewReaction && highlight.UserId != userId)
        {
            var reactor = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();

            if (reactor != null)
            {
                await _notificationService.CreateNotificationAsync(
                    highlight.UserId,
                    "highlight_liked",
                    $"{reactor} liked your highlight",
                    $"/portal?highlight={highlightId}",
                    userId,
                    highlight.GalleryPhoto?.PhotoUrl);
            }
        }

        var updated = await QueryHighlightsWithRelations()
            .FirstOrDefaultAsync(h => h.Id == highlightId);

        return updated == null ? null : MapToDto(updated, userId);
    }

    public async Task<int> CleanupExpiredHighlightsAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _context.DailyHighlights
            .Where(h => h.ExpiresAt <= now)
            .ToListAsync();

        if (expired.Count == 0) return 0;

        _context.DailyHighlights.RemoveRange(expired);
        await _context.SaveChangesAsync();
        return expired.Count;
    }

    private IQueryable<DailyHighlight> QueryHighlightsWithRelations(bool asNoTracking = true)
    {
        var query = _context.DailyHighlights
            .Include(h => h.User)
            .Include(h => h.GalleryPhoto)
            .Include(h => h.Mentions)
                .ThenInclude(m => m.MentionedUser)
            .Include(h => h.Reactions)
                .ThenInclude(r => r.User)
            .AsSplitQuery()
            .AsQueryable();

        return asNoTracking ? query.AsNoTracking() : query;
    }

    private static DailyHighlightDto MapToDto(DailyHighlight highlight, int? requesterUserId = null)
    {
        return new DailyHighlightDto
        {
            Id = highlight.Id,
            PhotoUrl = highlight.GalleryPhoto.PhotoUrl,
            CreatedAt = highlight.CreatedAt,
            IsOwnedByCurrentUser = requesterUserId.HasValue && highlight.UserId == requesterUserId.Value,
            User = new DailyHighlightUserDto
            {
                Username = highlight.User.Username,
                PhotoUrl = highlight.User.PhotoUrl,
                Gender = highlight.User.Gender.ToString()
            },
            MentionedUsers = highlight.Mentions
                .OrderBy(m => m.CreatedAt)
                .Select(m => new DailyHighlightMentionUserDto
                {
                    Id = m.MentionedUser.Id,
                    Username = m.MentionedUser.Username,
                    PhotoUrl = m.MentionedUser.PhotoUrl,
                    Gender = m.MentionedUser.Gender.ToString()
                })
                .ToList(),
            Reactions = highlight.Reactions
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new DailyHighlightReactionDto
                {
                    Id = r.Id,
                    Type = r.Type,
                    CreatedAt = r.CreatedAt,
                    IsCurrentUser = requesterUserId.HasValue && r.UserId == requesterUserId.Value,
                    User = new DailyHighlightReactionUserDto
                    {
                        Username = r.User.Username,
                        PhotoUrl = r.User.PhotoUrl
                    }
                })
                .ToList()
        };
    }
}
