using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCommunities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityInvites_Communities_CommunityId",
                table: "CommunityInvites");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityInvites_Users_InvitedByUserId",
                table: "CommunityInvites");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityInvites_Users_UserId",
                table: "CommunityInvites");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityMembers_Communities_CommunityId",
                table: "CommunityMembers");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityMembers_Users_UserId",
                table: "CommunityMembers");

            migrationBuilder.DropIndex(
                name: "IX_CommunityInvites_InvitedByUserId",
                table: "CommunityInvites");

            migrationBuilder.DropIndex(
                name: "IX_CommunityInvites_UserId",
                table: "CommunityInvites");

            migrationBuilder.DropIndex(
                name: "IX_CommunityInvites_CommunityId_UserId",
                table: "CommunityInvites");

            migrationBuilder.DropIndex(
                name: "IX_CommunityMembers_UserId",
                table: "CommunityMembers");

            migrationBuilder.DropIndex(
                name: "IX_CommunityMembers_CommunityId_UserId",
                table: "CommunityMembers");

            migrationBuilder.DropIndex(
                name: "IX_Communities_CreatedAtUtc",
                table: "Communities");

            migrationBuilder.DropIndex(
                name: "IX_Communities_LeaderUserId",
                table: "Communities");

            migrationBuilder.DropIndex(
                name: "IX_Communities_Name",
                table: "Communities");

            migrationBuilder.DropForeignKey(
                name: "FK_Communities_Users_LeaderUserId",
                table: "Communities");

            migrationBuilder.DropTable(
                name: "CommunityInvites");

            migrationBuilder.DropTable(
                name: "CommunityMembers");

            migrationBuilder.DropTable(
                name: "Communities");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Communities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LeaderUserId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PhotoUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Communities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Communities_Users_LeaderUserId",
                        column: x => x.LeaderUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CommunityMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommunityId = table.Column<int>(type: "int", nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunityMembers_Communities_CommunityId",
                        column: x => x.CommunityId,
                        principalTable: "Communities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunityMembers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CommunityInvites",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommunityId = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    InvitedByUserId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityInvites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunityInvites_Communities_CommunityId",
                        column: x => x.CommunityId,
                        principalTable: "Communities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunityInvites_Users_InvitedByUserId",
                        column: x => x.InvitedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CommunityInvites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Communities_CreatedAtUtc",
                table: "Communities",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Communities_LeaderUserId",
                table: "Communities",
                column: "LeaderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Communities_Name",
                table: "Communities",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommunityInvites_CommunityId_UserId",
                table: "CommunityInvites",
                columns: new[] { "CommunityId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommunityInvites_InvitedByUserId",
                table: "CommunityInvites",
                column: "InvitedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunityInvites_UserId",
                table: "CommunityInvites",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunityMembers_CommunityId_UserId",
                table: "CommunityMembers",
                columns: new[] { "CommunityId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommunityMembers_UserId",
                table: "CommunityMembers",
                column: "UserId");
        }
    }
}
