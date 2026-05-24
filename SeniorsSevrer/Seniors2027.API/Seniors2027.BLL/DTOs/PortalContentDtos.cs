namespace Seniors2027.BLL.DTOs;

public class AnnouncementDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public AnnouncementPollDto? Poll { get; set; }
}

public class CreateAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class UpdateAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool RemovePhoto { get; set; }
}

public class VoteAnnouncementPollDto
{
    public string Option { get; set; } = string.Empty;
}

public class AnnouncementPollDto
{
    public string Question { get; set; } = string.Empty;
    public IReadOnlyList<AnnouncementPollOptionDto> Options { get; set; } = Array.Empty<AnnouncementPollOptionDto>();
}

public class AnnouncementPollOptionDto
{
    public string Label { get; set; } = string.Empty;
    public int VoteCount { get; set; }
    public IReadOnlyList<AnnouncementPollVoterDto> Voters { get; set; } = Array.Empty<AnnouncementPollVoterDto>();
}

public class AnnouncementPollVoterDto
{
    public string Username { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public DateTime VotedAt { get; set; }
    public bool IsCurrentUser { get; set; }
}

public class PortalEventDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Location { get; set; }
    public string? Details { get; set; }
    public string? PhotoUrl { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreatePortalEventDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Location { get; set; }
    public string? Details { get; set; }
}

public class UpdatePortalEventDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Location { get; set; }
    public string? Details { get; set; }
    public bool RemovePhoto { get; set; }
}
