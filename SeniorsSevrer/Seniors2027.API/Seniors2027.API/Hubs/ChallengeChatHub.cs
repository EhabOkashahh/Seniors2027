using Microsoft.AspNetCore.SignalR;
using Seniors2027.BLL.DTOs.Challenges;
using Seniors2027.DAL.Data;
using Seniors2027.DAL.Entities;
using Microsoft.EntityFrameworkCore;
using Seniors2027.API.Extensions;

namespace Seniors2027.API.Hubs;

public class ChallengeChatHub : Hub
{
    private readonly AppDbContext _context;

    public ChallengeChatHub(AppDbContext context)
    {
        _context = context;
    }

    public async Task JoinChallenge(int challengeId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, challengeId.ToString());
    }

    public async Task SendMessage(int challengeId, string text)
    {
        if (!Context.User!.TryGetUserId(out var userId)) return;
        
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return;

        var message = new ChallengeMessage
        {
            ChallengeId = challengeId,
            UserId = userId,
            Text = text,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ChallengeMessages.Add(message);
        await _context.SaveChangesAsync();

        await Clients.Group(challengeId.ToString()).SendAsync("ReceiveMessage", new ChallengeMessageDto
        {
            Id = message.Id,
            ChallengeId = challengeId,
            UserId = userId,
            UserName = user.Username,
            UserColor = "var(--accent-blue)", // Or some user-based color logic
            Text = text,
            CreatedAtUtc = message.CreatedAtUtc
        });
    }
}
