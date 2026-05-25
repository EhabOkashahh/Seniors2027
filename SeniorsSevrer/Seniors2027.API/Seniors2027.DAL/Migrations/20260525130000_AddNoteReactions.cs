using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Seniors2027.DAL.Data;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525130000_AddNoteReactions")]
    public partial class AddNoteReactions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NoteReactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NoteId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteReactions_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: "Notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NoteReactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NoteReactions_CreatedAt",
                table: "NoteReactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_NoteReactions_NoteId_Type",
                table: "NoteReactions",
                columns: new[] { "NoteId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteReactions_NoteId_UserId",
                table: "NoteReactions",
                columns: new[] { "NoteId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NoteReactions_UserId",
                table: "NoteReactions",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NoteReactions");
        }
    }
}
