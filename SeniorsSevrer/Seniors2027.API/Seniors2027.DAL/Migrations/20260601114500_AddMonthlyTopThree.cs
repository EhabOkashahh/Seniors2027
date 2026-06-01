using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyTopThree : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChallengeMessages_ChallengeId",
                table: "ChallengeMessages");

            migrationBuilder.CreateTable(
                name: "MonthlyTopThree",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Rank1UserId = table.Column<int>(type: "int", nullable: false),
                    Rank1Username = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Rank1PhotoUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    Rank1Points = table.Column<int>(type: "int", nullable: false),
                    Rank2UserId = table.Column<int>(type: "int", nullable: false),
                    Rank2Username = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Rank2PhotoUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    Rank2Points = table.Column<int>(type: "int", nullable: false),
                    Rank3UserId = table.Column<int>(type: "int", nullable: false),
                    Rank3Username = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Rank3PhotoUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    Rank3Points = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyTopThree", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeMessages_ChallengeId_CreatedAtUtc",
                table: "ChallengeMessages",
                columns: new[] { "ChallengeId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyTopThree_Year_Month",
                table: "MonthlyTopThree",
                columns: new[] { "Year", "Month" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MonthlyTopThree");

            migrationBuilder.DropIndex(
                name: "IX_ChallengeMessages_ChallengeId_CreatedAtUtc",
                table: "ChallengeMessages");

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeMessages_ChallengeId",
                table: "ChallengeMessages",
                column: "ChallengeId");
        }
    }
}
