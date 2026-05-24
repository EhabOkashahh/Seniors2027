using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Seniors2027.API.Hubs;

[Authorize]
public class AnnouncementPollsHub : Hub
{
    public const string Route = "/hubs/announcement-polls";
    public static readonly PathString RoutePath = new(Route);
    public const string PollUpdatedEvent = "AnnouncementPollUpdated";
}
