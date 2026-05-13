using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddGalleryAndDailyHighlights : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GalleryPhotos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PhotoUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GalleryPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GalleryPhotos_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DailyHighlights",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    GalleryPhotoId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyHighlights", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyHighlights_GalleryPhotos_GalleryPhotoId",
                        column: x => x.GalleryPhotoId,
                        principalTable: "GalleryPhotos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyHighlights_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlights_ExpiresAt",
                table: "DailyHighlights",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlights_GalleryPhotoId",
                table: "DailyHighlights",
                column: "GalleryPhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlights_UserId_CreatedAt",
                table: "DailyHighlights",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GalleryPhotos_UserId_CreatedAt",
                table: "GalleryPhotos",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyHighlights");

            migrationBuilder.DropTable(
                name: "GalleryPhotos");
        }
    }
}
