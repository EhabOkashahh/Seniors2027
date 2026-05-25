using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyHighlightMentions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyHighlightMentions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DailyHighlightId = table.Column<int>(type: "int", nullable: false),
                    MentionedUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyHighlightMentions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyHighlightMentions_DailyHighlights_DailyHighlightId",
                        column: x => x.DailyHighlightId,
                        principalTable: "DailyHighlights",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyHighlightMentions_Users_MentionedUserId",
                        column: x => x.MentionedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightMentions_CreatedAt",
                table: "DailyHighlightMentions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightMentions_DailyHighlightId_MentionedUserId",
                table: "DailyHighlightMentions",
                columns: new[] { "DailyHighlightId", "MentionedUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightMentions_MentionedUserId",
                table: "DailyHighlightMentions",
                column: "MentionedUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyHighlightMentions");
        }
    }
}
