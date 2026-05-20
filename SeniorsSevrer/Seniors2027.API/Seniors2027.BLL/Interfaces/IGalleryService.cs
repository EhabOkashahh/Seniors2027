using Seniors2027.BLL.DTOs;

namespace Seniors2027.BLL.Interfaces;

public interface IGalleryService
{
    Task<GalleryPhotoDto> AddPhotoAsync(int userId, string photoUrl);
    Task<IReadOnlyList<GalleryPhotoDto>> GetUserPhotosAsync(int userId);
}
