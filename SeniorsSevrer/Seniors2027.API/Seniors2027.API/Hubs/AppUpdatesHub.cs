using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Seniors2027.API.Hubs;

[Authorize]
public class AppUpdatesHub : Hub
{
    public const string Route = "/hubs/app-updates";
    public static readonly PathString RoutePath = new(Route);

    public const string DailyHighlightsUpdatedEvent = "DailyHighlightsUpdated";
    public const string AnnouncementPollUpdatedEvent = "AnnouncementPollUpdated";
    public const string PortalContentUpdatedEvent = "PortalContentUpdated";
    public const string MemoryBoardUpdatedEvent = "MemoryBoardUpdated";
    public const string JoinRequestsUpdatedEvent = "JoinRequestsUpdated";
}
