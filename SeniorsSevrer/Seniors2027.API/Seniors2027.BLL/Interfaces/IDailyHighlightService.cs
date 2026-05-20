using Seniors2027.BLL.DTOs;

namespace Seniors2027.BLL.Interfaces;

public interface IDailyHighlightService
{
    Task<DailyHighlightDto> AddHighlightAsync(int userId, string photoUrl);
    Task<IReadOnlyList<DailyHighlightDto>> GetActiveHighlightsAsync(int maxCount);
    Task<DailyHighlightDto?> DeleteHighlightAsync(int highlightId, int requesterUserId, bool requesterIsAdmin = false);
    Task<int> CleanupExpiredHighlightsAsync();
}
