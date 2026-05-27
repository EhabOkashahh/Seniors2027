using System.ComponentModel.DataAnnotations;

namespace Seniors2027.BLL.DTOs.Challenges;

public class UpdateChallengeStatusRequestDto
{
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;
}
