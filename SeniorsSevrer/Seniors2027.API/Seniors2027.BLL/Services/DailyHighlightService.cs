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

    public DailyHighlightService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DailyHighlightDto> AddHighlightAsync(int userId, string photoUrl)
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

        await _context.DailyHighlights.AddAsync(highlight);
        user.Points += HighlightPointsAward;
        await _context.SaveChangesAsync();

        return new DailyHighlightDto
        {
            Id = highlight.Id,
            PhotoUrl = galleryPhoto.PhotoUrl,
            CreatedAt = highlight.CreatedAt,
            IsOwnedByCurrentUser = true,
            User = new DailyHighlightUserDto
            {
                Username = user.Username,
                PhotoUrl = user.PhotoUrl,
                Gender = user.Gender.ToString()
            },
            Reactions = new List<DailyHighlightReactionDto>()
        };
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

        return deletedDto;
    }

    public async Task<DailyHighlightDto?> ToggleReactionAsync(int highlightId, int userId, DailyHighlightReactionType type)
    {
        var highlight = await QueryHighlightsWithRelations(asNoTracking: false)
            .FirstOrDefaultAsync(h => h.Id == highlightId);

        if (highlight == null) return null;

        var existingReaction = highlight.Reactions.FirstOrDefault(r => r.UserId == userId);
        var now = DateTime.UtcNow;

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
        }
        else if (existingReaction.Type == type)
        {
            _context.DailyHighlightReactions.Remove(existingReaction);
        }
        else
        {
            existingReaction.Type = type;
            existingReaction.CreatedAt = now;
        }

        await _context.SaveChangesAsync();

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
            .Include(h => h.Reactions)
                .ThenInclude(r => r.User)
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
