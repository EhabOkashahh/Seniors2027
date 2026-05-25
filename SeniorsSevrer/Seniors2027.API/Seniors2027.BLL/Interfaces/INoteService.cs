using Seniors2027.BLL.DTOs;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Interfaces;

public interface INoteService
{
    Task<NoteDto> CreateNoteAsync(int senderId, CreateNoteDto dto);
    Task<IReadOnlyList<NoteDto>> GetLatestReceivedNotesAsync(int recipientId, int count, int? requesterUserId = null);
    Task<PagedNotesResponseDto> GetReceivedNotesAsync(int recipientId, int pageNumber, int pageSize, int? requesterUserId = null);
    Task<NoteDto?> ToggleReactionAsync(int noteId, int userId, NoteReactionType type);
    Task<bool> DeleteNoteAsync(int noteId, int requesterUserId, bool requesterIsAdmin = false);
}
