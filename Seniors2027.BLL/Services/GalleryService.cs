using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class GalleryService : IGalleryService
{
    private readonly AppDbContext _context;

    public GalleryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<GalleryPhotoDto> AddPhotoAsync(int userId, string photoUrl)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists) throw new InvalidOperationException("User not found.");

        var photo = new GalleryPhoto
        {
            UserId = userId,
            PhotoUrl = photoUrl,
            CreatedAt = DateTime.UtcNow
        };

        await _context.GalleryPhotos.AddAsync(photo);
        await _context.SaveChangesAsync();

        return new GalleryPhotoDto
        {
            Id = photo.Id,
            UserId = photo.UserId,
            PhotoUrl = photo.PhotoUrl,
            CreatedAt = photo.CreatedAt
        };
    }

    public async Task<IReadOnlyList<GalleryPhotoDto>> GetUserPhotosAsync(int userId)
    {
        return await _context.GalleryPhotos
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new GalleryPhotoDto
            {
                Id = p.Id,
                UserId = p.UserId,
                PhotoUrl = p.PhotoUrl,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }
}
