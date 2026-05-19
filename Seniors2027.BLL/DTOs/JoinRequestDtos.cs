using Seniors2027.DAL.Entities;

namespace Seniors2027.BLL.DTOs;

public class JoinRequestDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public JoinRequestStatus Status { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUsername { get; set; }
    public int? ApprovedUserId { get; set; }
}

public class ReviewJoinRequestDto
{
    public required JoinRequestDecision Decision { get; set; }
}
