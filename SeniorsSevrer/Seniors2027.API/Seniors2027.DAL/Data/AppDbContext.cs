using Microsoft.EntityFrameworkCore;
using Seniors2027.DAL.Entities;

namespace Seniors2027.DAL.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Note> Notes { get; set; }
    public DbSet<NoteReaction> NoteReactions { get; set; }
    public DbSet<GalleryPhoto> GalleryPhotos { get; set; }
    public DbSet<DailyHighlight> DailyHighlights { get; set; }
    public DbSet<DailyHighlightReaction> DailyHighlightReactions { get; set; }
    public DbSet<DailyHighlightMention> DailyHighlightMentions { get; set; }
    public DbSet<UserOtp> UsersOTPs { get; set; }
    public DbSet<JoinRequest> JoinRequests { get; set; }
    public DbSet<Announcement> Announcements { get; set; }
    public DbSet<ChallengeMessage> ChallengeMessages { get; set; }
    public DbSet<AnnouncementPollVote> AnnouncementPollVotes { get; set; }
    public DbSet<PortalEvent> Events { get; set; }
    public DbSet<MemoryBoardPhoto> MemoryBoardPhotos { get; set; }
    public DbSet<Challenge> Challenges { get; set; }
    public DbSet<ChallengeParticipant> ChallengeParticipants { get; set; }
    public DbSet<ChallengeSubmission> ChallengeSubmissions { get; set; }
    public DbSet<ChallengeVote> ChallengeVotes { get; set; }
    public DbSet<Notification> Notifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(320);
            entity.Property(e => e.SocialLinksJson).HasMaxLength(4000);
            entity.Property(e => e.FavoriteSongEmbedUrl).HasMaxLength(2048);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasConversion<int>();
            entity.Property(e => e.IsLocked).HasDefaultValue(false);
            entity.Property(e => e.Points).HasDefaultValue(0);
        });

        modelBuilder.Entity<Note>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);
            entity.HasOne(e => e.Sender)
                .WithMany(u => u.SentNotes)
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Recipient)
                .WithMany(u => u.ReceivedNotes)
                .HasForeignKey(e => e.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.RecipientId, e.CreatedAt });
        });

        modelBuilder.Entity<NoteReaction>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Type).HasConversion<int>();
            entity.HasOne(e => e.Note)
                .WithMany(n => n.Reactions)
                .HasForeignKey(e => e.NoteId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany(u => u.NoteReactions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.NoteId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.NoteId, e.Type });
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<GalleryPhoto>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.PhotoUrl).IsRequired().HasMaxLength(2048);
            entity.HasOne(e => e.User)
                .WithMany(u => u.GalleryPhotos)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });

        modelBuilder.Entity<DailyHighlight>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasOne(e => e.User)
                .WithMany(u => u.DailyHighlights)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.GalleryPhoto)
                .WithMany(g => g.DailyHighlights)
                .HasForeignKey(e => e.GalleryPhotoId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });

        modelBuilder.Entity<DailyHighlightReaction>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Type).HasConversion<int>();
            entity.HasOne(e => e.DailyHighlight)
                .WithMany(h => h.Reactions)
                .HasForeignKey(e => e.DailyHighlightId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany(u => u.DailyHighlightReactions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.DailyHighlightId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.DailyHighlightId, e.Type });
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<DailyHighlightMention>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasOne(e => e.DailyHighlight)
                .WithMany(h => h.Mentions)
                .HasForeignKey(e => e.DailyHighlightId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MentionedUser)
                .WithMany(u => u.MentionedInDailyHighlights)
                .HasForeignKey(e => e.MentionedUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.DailyHighlightId, e.MentionedUserId }).IsUnique();
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<UserOtp>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(320);
            entity.Property(e => e.OtpCode).IsRequired().HasMaxLength(20);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.Email, e.CreatedAt });
            entity.HasIndex(e => e.ExpiryTime);
        });

        modelBuilder.Entity<JoinRequest>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(320);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasIndex(e => new { e.Email, e.Status });

            entity.HasOne(e => e.ReviewedByUser)
                .WithMany()
                .HasForeignKey(e => e.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Body).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.PhotoUrl).HasMaxLength(2048);
            entity.HasOne(e => e.CreatedByUser)
                .WithMany(u => u.Announcements)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<AnnouncementPollVote>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Option).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Announcement)
                .WithMany(a => a.PollVotes)
                .HasForeignKey(e => e.AnnouncementId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany(u => u.AnnouncementPollVotes)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.AnnouncementId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.AnnouncementId, e.Option });
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<PortalEvent>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Location).HasMaxLength(300);
            entity.Property(e => e.Details).HasMaxLength(4000);
            entity.Property(e => e.PhotoUrl).HasMaxLength(2048);
            entity.HasOne(e => e.CreatedByUser)
                .WithMany(u => u.Events)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.EventDate);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<MemoryBoardPhoto>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.PhotoUrl).IsRequired().HasMaxLength(2048);
            entity.Property(e => e.Status).HasConversion<int>();

            entity.HasOne(e => e.User)
                .WithMany(u => u.MemoryBoardPhotos)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ReviewedByUser)
                .WithMany()
                .HasForeignKey(e => e.ReviewedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(e => new { e.Status, e.ExifTakenAtUtc, e.CreatedAt });
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });

        modelBuilder.Entity<Challenge>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.LogoUrl).HasMaxLength(2048);
            entity.Property(e => e.SoundUrl).HasMaxLength(2048);
            entity.Property(e => e.UploadType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany(u => u.CreatedChallenges)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasIndex(e => e.CreatedAtUtc);
            entity.HasIndex(e => e.DeadlineUtc);
        });

        modelBuilder.Entity<ChallengeParticipant>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Challenge)
                .WithMany(c => c.Participants)
                .HasForeignKey(e => e.ChallengeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.ChallengeParticipations)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.ChallengeId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<ChallengeSubmission>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.MediaUrl).IsRequired().HasMaxLength(2048);
            entity.Property(e => e.MediaType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Caption).HasMaxLength(120);

            entity.HasOne(e => e.Challenge)
                .WithMany(c => c.Submissions)
                .HasForeignKey(e => e.ChallengeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.ChallengeSubmissions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.ChallengeId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.CreatedAtUtc);
        });

        modelBuilder.Entity<ChallengeVote>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            entity.HasOne(e => e.Challenge)
                .WithMany(c => c.Votes)
                .HasForeignKey(e => e.ChallengeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Submission)
                .WithMany(s => s.Votes)
                .HasForeignKey(e => e.SubmissionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.VoterUser)
                .WithMany(u => u.ChallengeVotes)
                .HasForeignKey(e => e.VoterUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.ChallengeId, e.VoterUserId }).IsUnique();
            entity.HasIndex(e => e.CreatedAtUtc);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Link).HasMaxLength(300);
            entity.Property(e => e.ImageUrl).HasMaxLength(2048);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Actor)
                .WithMany()
                .HasForeignKey(e => e.ActorId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(e => new { e.UserId, e.IsRead });
            entity.HasIndex(e => e.CreatedAt);
        });
    }
}
