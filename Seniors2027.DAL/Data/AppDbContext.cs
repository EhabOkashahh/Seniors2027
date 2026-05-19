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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
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
    }
}
