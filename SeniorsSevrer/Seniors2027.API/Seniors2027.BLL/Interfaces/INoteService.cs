using Seniors2027.BLL.DTOs;

namespace Seniors2027.BLL.Interfaces;

public interface INoteService
{
    Task<NoteDto> CreateNoteAsync(int senderId, CreateNoteDto dto);
    Task<IReadOnlyList<NoteDto>> GetLatestReceivedNotesAsync(int recipientId, int count);
    Task<PagedNotesResponseDto> GetReceivedNotesAsync(int recipientId, int pageNumber, int pageSize);
    Task<bool> DeleteNoteAsync(int noteId, int requesterUserId);
}
