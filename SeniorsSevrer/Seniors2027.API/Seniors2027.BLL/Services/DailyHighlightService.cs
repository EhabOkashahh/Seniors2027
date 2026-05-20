using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class DailyHighlightService : IDailyHighlightService
{
    private readonly AppDbContext _context;

    public DailyHighlightService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DailyHighlightDto> AddHighlightAsync(int userId, string photoUrl)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Id, u.Username, u.PhotoUrl })
            .FirstOrDefaultAsync()
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
        await _context.SaveChangesAsync();

        return new DailyHighlightDto
        {
            Id = highlight.Id,
            UserId = highlight.UserId,
            GalleryPhotoId = highlight.GalleryPhotoId,
            PhotoUrl = galleryPhoto.PhotoUrl,
            CreatedAt = highlight.CreatedAt,
            ExpiresAt = highlight.ExpiresAt,
            User = new DailyHighlightUserDto
            {
                Id = user.Id,
                Username = user.Username,
                PhotoUrl = user.PhotoUrl
            }
        };
    }

    public async Task<IReadOnlyList<DailyHighlightDto>> GetActiveHighlightsAsync(int maxCount)
    {
        await CleanupExpiredHighlightsAsync();

        var safeMax = maxCount < 1 ? 30 : Math.Min(maxCount, 200);
        var now = DateTime.UtcNow;

        return await _context.DailyHighlights
            .AsNoTracking()
            .Where(h => h.ExpiresAt > now)
            .OrderByDescending(h => h.CreatedAt)
            .Take(safeMax)
            .Select(h => new DailyHighlightDto
            {
                Id = h.Id,
                UserId = h.UserId,
                GalleryPhotoId = h.GalleryPhotoId,
                PhotoUrl = h.GalleryPhoto.PhotoUrl,
                CreatedAt = h.CreatedAt,
                ExpiresAt = h.ExpiresAt,
                User = new DailyHighlightUserDto
                {
                    Id = h.User.Id,
                    Username = h.User.Username,
                    PhotoUrl = h.User.PhotoUrl
                }
            })
            .ToListAsync();
    }

    public async Task<DailyHighlightDto?> DeleteHighlightAsync(int highlightId, int requesterUserId, bool requesterIsAdmin = false)
    {
        var highlight = await _context.DailyHighlights
            .Include(h => h.User)
            .Include(h => h.GalleryPhoto)
            .FirstOrDefaultAsync(h => h.Id == highlightId);

        if (highlight == null) return null;
        if (!requesterIsAdmin && highlight.UserId != requesterUserId) return null;

        var deletedDto = new DailyHighlightDto
        {
            Id = highlight.Id,
            UserId = highlight.UserId,
            GalleryPhotoId = highlight.GalleryPhotoId,
            PhotoUrl = highlight.GalleryPhoto.PhotoUrl,
            CreatedAt = highlight.CreatedAt,
            ExpiresAt = highlight.ExpiresAt,
            User = new DailyHighlightUserDto
            {
                Id = highlight.User.Id,
                Username = highlight.User.Username,
                PhotoUrl = highlight.User.PhotoUrl
            }
        };

        _context.DailyHighlights.Remove(highlight);
        _context.GalleryPhotos.Remove(highlight.GalleryPhoto);
        await _context.SaveChangesAsync();

        return deletedDto;
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
}
