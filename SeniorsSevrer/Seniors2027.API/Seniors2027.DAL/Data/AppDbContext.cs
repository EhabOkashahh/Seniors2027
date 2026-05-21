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
    public DbSet<GalleryPhoto> GalleryPhotos { get; set; }
    public DbSet<DailyHighlight> DailyHighlights { get; set; }
    public DbSet<UserOtp> UsersOTPs { get; set; }
    public DbSet<JoinRequest> JoinRequests { get; set; }
    public DbSet<Announcement> Announcements { get; set; }
    public DbSet<PortalEvent> Events { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(320);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasConversion<int>();
            entity.Property(e => e.IsLocked).HasDefaultValue(false);
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
            entity.HasOne(e => e.CreatedByUser)
                .WithMany(u => u.Announcements)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<PortalEvent>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Location).HasMaxLength(300);
            entity.Property(e => e.Details).HasMaxLength(4000);
            entity.HasOne(e => e.CreatedByUser)
                .WithMany(u => u.Events)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.EventDate);
            entity.HasIndex(e => e.CreatedAt);
        });
    }
}
