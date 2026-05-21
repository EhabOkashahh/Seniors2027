namespace Seniors2027.BLL.DTOs;

public class AnnouncementDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class PortalEventDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Location { get; set; }
    public string? Details { get; set; }
    public int CreatedByUserId { get; set; }
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
