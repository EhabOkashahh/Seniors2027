using System.ComponentModel.DataAnnotations;

namespace Seniors2027.DAL.Entities;

public class User
{
    [Key]
    public int Id { get; set; }
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;
    [Required]
    public Gender Gender { get; set; }

    public string? PhotoUrl { get; set; }
    [MaxLength(1000)]
    public string? Description { get; set; }
    [MaxLength(4000)]
    public string? SocialLinksJson { get; set; }
    [MaxLength(2048)]
    public string? FavoriteSongEmbedUrl { get; set; }
    [Required]
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required]
    public UserRole Role { get; set; } = UserRole.Member;
    [Required]
    public bool IsLocked { get; set; } = false;
    public DateTime? LockedAtUtc { get; set; }
    [Required]
    public int Points { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Note> SentNotes { get; set; } = new List<Note>();
    public ICollection<Note> ReceivedNotes { get; set; } = new List<Note>();
    public ICollection<NoteReaction> NoteReactions { get; set; } = new List<NoteReaction>();
    public ICollection<GalleryPhoto> GalleryPhotos { get; set; } = new List<GalleryPhoto>();
    public ICollection<DailyHighlight> DailyHighlights { get; set; } = new List<DailyHighlight>();
    public ICollection<DailyHighlightReaction> DailyHighlightReactions { get; set; } = new List<DailyHighlightReaction>();
    public ICollection<DailyHighlightMention> MentionedInDailyHighlights { get; set; } = new List<DailyHighlightMention>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    public ICollection<AnnouncementPollVote> AnnouncementPollVotes { get; set; } = new List<AnnouncementPollVote>();
    public ICollection<PortalEvent> Events { get; set; } = new List<PortalEvent>();
    public ICollection<MemoryBoardPhoto> MemoryBoardPhotos { get; set; } = new List<MemoryBoardPhoto>();
    public ICollection<Challenge> CreatedChallenges { get; set; } = new List<Challenge>();
    public ICollection<ChallengeParticipant> ChallengeParticipations { get; set; } = new List<ChallengeParticipant>();
    public ICollection<ChallengeSubmission> ChallengeSubmissions { get; set; } = new List<ChallengeSubmission>();
    public ICollection<ChallengeVote> ChallengeVotes { get; set; } = new List<ChallengeVote>();
}
