using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class NoteService : INoteService
{
    private const int NotePointsAward = 1;
    private readonly AppDbContext _context;

    public NoteService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<NoteDto> CreateNoteAsync(int senderId, CreateNoteDto dto)
    {
        if (senderId == dto.RecipientId) throw new InvalidOperationException("You cannot send a note to yourself.");

        var sender = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == senderId)
            ?? throw new InvalidOperationException("Sender not found.");

        var recipientExists = await _context.Users.AnyAsync(u => u.Id == dto.RecipientId);
        if (!recipientExists) throw new InvalidOperationException("Recipient not found.");

        var note = new Note
        {
            SenderId = senderId,
            RecipientId = dto.RecipientId,
            Content = dto.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notes.AddAsync(note);
        sender.Points += NotePointsAward;
        await _context.SaveChangesAsync();

        return new NoteDto
        {
            Id = note.Id,
            Content = note.Content,
            CreatedAt = note.CreatedAt,
            Sender = new NoteSenderDto
            {
                Id = sender.Id,
                Username = sender.Username,
                PhotoUrl = sender.PhotoUrl
            }
        };
    }

    public async Task<IReadOnlyList<NoteDto>> GetLatestReceivedNotesAsync(int recipientId, int count)
    {
        var safeCount = count < 1 ? 3 : Math.Min(count, 20);

        return await _context.Notes
            .AsNoTracking()
            .Where(n => n.RecipientId == recipientId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(safeCount)
            .Select(n => new NoteDto
            {
                Id = n.Id,
                Content = n.Content,
                CreatedAt = n.CreatedAt,
                Sender = new NoteSenderDto
                {
                    Id = n.Sender.Id,
                    Username = n.Sender.Username,
                    PhotoUrl = n.Sender.PhotoUrl
                }
            })
            .ToListAsync();
    }

    public async Task<PagedNotesResponseDto> GetReceivedNotesAsync(int recipientId, int pageNumber, int pageSize)
    {
        var safePageNumber = pageNumber < 1 ? 1 : pageNumber;
        var safePageSize = pageSize < 1 ? 2 : Math.Min(pageSize, 20);

        var query = _context.Notes
            .AsNoTracking()
            .Where(n => n.RecipientId == recipientId)
            .OrderByDescending(n => n.CreatedAt);

        var totalCount = await query.CountAsync();
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)safePageSize);

        var items = await query
            .Skip((safePageNumber - 1) * safePageSize)
            .Take(safePageSize)
            .Select(n => new NoteDto
            {
                Id = n.Id,
                Content = n.Content,
                CreatedAt = n.CreatedAt,
                Sender = new NoteSenderDto
                {
                    Id = n.Sender.Id,
                    Username = n.Sender.Username,
                    PhotoUrl = n.Sender.PhotoUrl
                }
            })
            .ToListAsync();

        return new PagedNotesResponseDto
        {
            PageNumber = safePageNumber,
            PageSize = safePageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            Items = items
        };
    }

    public async Task<bool> DeleteNoteAsync(int noteId, int requesterUserId, bool requesterIsAdmin = false)
    {
        var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == noteId);
        if (note == null) return false;
        var requesterIsSender = note.SenderId == requesterUserId;
        var requesterIsRecipient = note.RecipientId == requesterUserId;

        if (!requesterIsAdmin && !requesterIsSender && !requesterIsRecipient)
        {
            throw new InvalidOperationException("You can delete notes you sent and notes sent to your profile.");
        }

        var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == note.SenderId);
        if (sender != null)
        {
            sender.Points = Math.Max(0, sender.Points - NotePointsAward);
        }

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync();
        return true;
    }
}
