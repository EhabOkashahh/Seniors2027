using Microsoft.EntityFrameworkCore;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.Services;

public class NoteService : INoteService
{
    private const int NotePointsAward = 1;
    private const int MaxDailyNotePoints = 20;
    private readonly AppDbContext _context;
    private readonly IAppUpdatesRealtimeNotifier _appUpdatesRealtimeNotifier;
    private readonly INotificationService _notificationService;

    public NoteService(AppDbContext context, IAppUpdatesRealtimeNotifier appUpdatesRealtimeNotifier, INotificationService notificationService)
    {
        _context = context;
        _appUpdatesRealtimeNotifier = appUpdatesRealtimeNotifier;
        _notificationService = notificationService;
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

        var todayStart = DateTime.UtcNow.Date;
        var todayPoints = await _context.Notes
            .Where(n => n.SenderId == senderId && n.CreatedAt >= todayStart)
            .CountAsync();

        if (todayPoints < MaxDailyNotePoints)
        {
            sender.Points += NotePointsAward;
        }

        await _context.SaveChangesAsync();

        await _notificationService.CreateNotificationAsync(
            dto.RecipientId,
            "note_received",
            $"{sender.Username} sent you a note",
            $"/profile/{dto.RecipientId}?scroll=notes&noteId={note.Id}",
            sender.Id);

        await _appUpdatesRealtimeNotifier.NotifyUserPointsUpdatedAsync(sender.Id, sender.Points);

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
            },
            Reactions = new List<NoteReactionDto>()
        };
    }

    public async Task<IReadOnlyList<NoteDto>> GetLatestReceivedNotesAsync(int recipientId, int count, int? requesterUserId = null)
    {
        var safeCount = count < 1 ? 3 : Math.Min(count, 20);

        var notes = await QueryNotesWithRelations()
            .Where(n => n.RecipientId == recipientId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(safeCount)
            .ToListAsync();

        return notes.Select(n => MapToDto(n, requesterUserId)).ToList();
    }

    public async Task<PagedNotesResponseDto> GetReceivedNotesAsync(int recipientId, int pageNumber, int pageSize, int? requesterUserId = null)
    {
        var safePageNumber = pageNumber < 1 ? 1 : pageNumber;
        var safePageSize = pageSize < 1 ? 2 : Math.Min(pageSize, 20);

        var query = QueryNotesWithRelations()
            .Where(n => n.RecipientId == recipientId)
            .OrderByDescending(n => n.CreatedAt);

        var totalCount = await query.CountAsync();
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)safePageSize);

        var notes = await query
            .Skip((safePageNumber - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync();

        var items = notes.Select(n => MapToDto(n, requesterUserId)).ToList();

        return new PagedNotesResponseDto
        {
            PageNumber = safePageNumber,
            PageSize = safePageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            Items = items
        };
    }

    public async Task<IReadOnlyList<NoteDto>> GetNotesInRangeAsync(DateTime from, DateTime to, int? requesterUserId = null)
    {
        var notes = await QueryNotesWithRelations()
            .Where(n => n.CreatedAt >= from && n.CreatedAt < to)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notes.Select(n => MapToDto(n, requesterUserId)).ToList();
    }

    public async Task<NoteDto?> ToggleReactionAsync(int noteId, int userId, NoteReactionType type)
    {
        var note = await QueryNotesWithRelations(asNoTracking: false)
            .Include(n => n.Sender)
            .FirstOrDefaultAsync(n => n.Id == noteId);
        if (note == null) return null;

        var existingReaction = note.Reactions.FirstOrDefault(r => r.UserId == userId);
        var now = DateTime.UtcNow;
        var isNewReaction = false;

        if (existingReaction == null)
        {
            var reaction = new NoteReaction
            {
                NoteId = note.Id,
                UserId = userId,
                Type = type,
                CreatedAt = now
            };
            _context.NoteReactions.Add(reaction);
            isNewReaction = true;
        }
        else if (existingReaction.Type == type)
        {
            _context.NoteReactions.Remove(existingReaction);
        }
        else
        {
            existingReaction.Type = type;
            existingReaction.CreatedAt = now;
            isNewReaction = true;
        }

        await _context.SaveChangesAsync();

        if (isNewReaction && note.SenderId != userId)
        {
            var reactor = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();

            if (reactor != null)
            {
                var contentPreview = note.Content.Length > 80
                    ? note.Content[..80] + "..."
                    : note.Content;
                await _notificationService.CreateNotificationAsync(
                    note.SenderId,
                    "note_liked",
                    $"{reactor} liked: \"{contentPreview}\"",
                    $"/profile/{note.RecipientId}?scroll=notes&noteId={note.Id}",
                    userId);
            }
        }

        var updated = await QueryNotesWithRelations()
            .FirstOrDefaultAsync(n => n.Id == noteId);
        return updated == null ? null : MapToDto(updated, userId);
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

        if (sender != null)
        {
            await _appUpdatesRealtimeNotifier.NotifyUserPointsUpdatedAsync(sender.Id, sender.Points);
        }

        return true;
    }

    private IQueryable<Note> QueryNotesWithRelations(bool asNoTracking = true)
    {
        var query = _context.Notes
            .Include(n => n.Sender)
            .Include(n => n.Recipient)
            .Include(n => n.Reactions)
                .ThenInclude(r => r.User)
            .AsQueryable();

        return asNoTracking ? query.AsNoTracking() : query;
    }

    private static NoteDto MapToDto(Note note, int? requesterUserId = null)
    {
        return new NoteDto
        {
            Id = note.Id,
            Content = note.Content,
            CreatedAt = note.CreatedAt,
            Sender = new NoteSenderDto
            {
                Id = note.Sender.Id,
                Username = note.Sender.Username,
                PhotoUrl = note.Sender.PhotoUrl
            },
            Recipient = new NoteRecipientDto
            {
                Id = note.Recipient.Id,
                Username = note.Recipient.Username,
                PhotoUrl = note.Recipient.PhotoUrl
            },
            Reactions = note.Reactions
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new NoteReactionDto
                {
                    Id = r.Id,
                    Type = r.Type,
                    CreatedAt = r.CreatedAt,
                    IsCurrentUser = requesterUserId.HasValue && r.UserId == requesterUserId.Value,
                    User = new NoteReactionUserDto
                    {
                        Username = r.User.Username,
                        PhotoUrl = r.User.PhotoUrl
                    }
                })
                .ToList()
        };
    }
}
