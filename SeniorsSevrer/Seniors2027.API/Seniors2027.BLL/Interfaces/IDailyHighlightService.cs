using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Interfaces;

public interface IDailyHighlightService
{
    Task<DailyHighlightDto> AddHighlightAsync(int userId, string photoUrl);
    Task<IReadOnlyList<DailyHighlightDto>> GetActiveHighlightsAsync(int maxCount, int? requesterUserId = null);
    Task<IReadOnlyList<DailyHighlightDto>> GetHighlightsArchiveAsync(int maxCount, int? requesterUserId = null);
    Task<DailyHighlightDto?> DeleteHighlightAsync(int highlightId, int requesterUserId, bool requesterIsAdmin = false);
    Task<DailyHighlightDto?> ToggleReactionAsync(int highlightId, int userId, DailyHighlightReactionType type);
    Task<int> CleanupExpiredHighlightsAsync();
}
