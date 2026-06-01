namespace Seniors2027.BLL.DTOs;

public class BadgeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SvgUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UserBadgeDto
{
    public int Id { get; set; }
    public BadgeDto Badge { get; set; } = null!;
    public DateTime AwardedAtUtc { get; set; }
}

public class CreateBadgeDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class AwardBadgeDto
{
    public int UserId { get; set; }
    public int BadgeId { get; set; }
}
