using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seniors2027.API.Extensions;
using Seniors2027.BLL.DTOs;
using Seniors2027.BLL.Interfaces;
using Seniors2027.DAL.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Seniors2027.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;

    public NotesController(INoteService noteService)
    {
        _noteService = noteService;
    }

    [HttpPost]
    public async Task<ActionResult<NoteDto>> CreateNote(CreateNoteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content)) return BadRequest("Note content is required.");

        var senderIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;

        if (!int.TryParse(senderIdClaim, out var senderId)) return Unauthorized();

        try
        {
            var note = await _noteService.CreateNoteAsync(senderId, dto);
            return Ok(note);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("received/{recipientId:int}/latest")]
    public async Task<ActionResult<IReadOnlyList<NoteDto>>> GetLatestReceivedNotes(int recipientId, [FromQuery] int count = 3)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        var notes = await _noteService.GetLatestReceivedNotesAsync(recipientId, count, requesterUserId);
        return Ok(notes);
    }

    [HttpGet("received/{recipientId:int}")]
    public async Task<ActionResult<PagedNotesResponseDto>> GetReceivedNotes(
        int recipientId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 2)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        var notes = await _noteService.GetReceivedNotesAsync(recipientId, pageNumber, pageSize, requesterUserId);
        return Ok(notes);
    }

    [HttpPost("{id:int}/reactions")]
    public async Task<ActionResult<NoteDto>> ToggleReaction(int id, [FromBody] ToggleNoteReactionDto dto)
    {
        if (!User.TryGetUserId(out var requesterUserId)) return Unauthorized();
        if (!Enum.IsDefined(dto.Type)) return BadRequest("Invalid reaction type.");

        var updated = await _noteService.ToggleReactionAsync(id, requesterUserId, dto.Type);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> DeleteNote(int id)
    {
        var requesterIdClaim = User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
        if (!int.TryParse(requesterIdClaim, out var requesterUserId)) return Unauthorized();
        var requesterIsAdmin = User.IsInRole(nameof(UserRole.Admin));

        try
        {
            var deleted = await _noteService.DeleteNoteAsync(id, requesterUserId, requesterIsAdmin);
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
    }
}
