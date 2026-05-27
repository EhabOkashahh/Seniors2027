using System.ComponentModel.DataAnnotations;

namespace Seniors2027.BLL.DTOs.Challenges;

public class CreateChallengeSubmissionRequestDto
{
    [MaxLength(120)]
    public string? Caption { get; set; }
}
