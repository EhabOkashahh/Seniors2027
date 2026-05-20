using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace Seniors2027.API.Hubs;

[Authorize]
public class DailyHighlightsHub : Hub
{
    public const string Route = "/hubs/daily-highlights";
    public static readonly PathString RoutePath = new(Route);
    public const string HighlightsUpdatedEvent = "DailyHighlightsUpdated";
}
