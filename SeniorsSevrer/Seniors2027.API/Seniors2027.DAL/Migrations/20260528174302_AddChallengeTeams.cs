using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddChallengeTeams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TeamId",
                table: "ChallengeSubmissions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ChallengeTeams",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ChallengeId = table.Column<int>(type: "int", nullable: false),
                    SubmissionId = table.Column<int>(type: "int", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChallengeTeams", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChallengeTeams_ChallengeSubmissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "ChallengeSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ChallengeTeams_Challenges_ChallengeId",
                        column: x => x.ChallengeId,
                        principalTable: "Challenges",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ChallengeTeamMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChallengeTeamMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChallengeTeamMembers_ChallengeTeams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "ChallengeTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChallengeTeamMembers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeSubmissions_TeamId",
                table: "ChallengeSubmissions",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeTeamMembers_TeamId_UserId",
                table: "ChallengeTeamMembers",
                columns: new[] { "TeamId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeTeamMembers_UserId",
                table: "ChallengeTeamMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeTeams_ChallengeId",
                table: "ChallengeTeams",
                column: "ChallengeId");

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeTeams_SubmissionId",
                table: "ChallengeTeams",
                column: "SubmissionId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChallengeSubmissions_ChallengeTeams_TeamId",
                table: "ChallengeSubmissions",
                column: "TeamId",
                principalTable: "ChallengeTeams",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChallengeSubmissions_ChallengeTeams_TeamId",
                table: "ChallengeSubmissions");

            migrationBuilder.DropTable(
                name: "ChallengeTeamMembers");

            migrationBuilder.DropTable(
                name: "ChallengeTeams");

            migrationBuilder.DropIndex(
                name: "IX_ChallengeSubmissions_TeamId",
                table: "ChallengeSubmissions");

            migrationBuilder.DropColumn(
                name: "TeamId",
                table: "ChallengeSubmissions");
        }
    }
}
