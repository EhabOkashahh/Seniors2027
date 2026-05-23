using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyHighlightReactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyHighlightReactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DailyHighlightId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyHighlightReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyHighlightReactions_DailyHighlights_DailyHighlightId",
                        column: x => x.DailyHighlightId,
                        principalTable: "DailyHighlights",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyHighlightReactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightReactions_CreatedAt",
                table: "DailyHighlightReactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightReactions_DailyHighlightId_Type",
                table: "DailyHighlightReactions",
                columns: new[] { "DailyHighlightId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightReactions_DailyHighlightId_UserId",
                table: "DailyHighlightReactions",
                columns: new[] { "DailyHighlightId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyHighlightReactions_UserId",
                table: "DailyHighlightReactions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyHighlightReactions");
        }
    }
}
