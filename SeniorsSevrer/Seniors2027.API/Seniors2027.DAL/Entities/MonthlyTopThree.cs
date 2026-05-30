using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class MonthlyTopThree
{
    [Key]
    public int Id { get; set; }

    public int Year { get; set; }

    public int Month { get; set; }

    public int Rank1UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Rank1Username { get; set; } = string.Empty;

    public string? Rank1PhotoUrl { get; set; }

    public int Rank1Points { get; set; }

    public int Rank2UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Rank2Username { get; set; } = string.Empty;

    public string? Rank2PhotoUrl { get; set; }

    public int Rank2Points { get; set; }

    public int Rank3UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Rank3Username { get; set; } = string.Empty;

    public string? Rank3PhotoUrl { get; set; }

    public int Rank3Points { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
