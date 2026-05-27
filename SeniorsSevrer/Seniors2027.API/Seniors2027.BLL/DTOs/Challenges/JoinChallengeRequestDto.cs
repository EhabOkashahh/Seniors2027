using System.ComponentModel.DataAnnotations;

namespace Seniors2027.BLL.DTOs.Challenges;

public class JoinChallengeRequestDto
{
    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty;
}
