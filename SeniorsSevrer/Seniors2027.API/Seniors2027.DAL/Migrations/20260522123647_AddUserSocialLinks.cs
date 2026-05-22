using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSocialLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SocialLinksJson",
                table: "Users",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SocialLinksJson",
                table: "Users");
        }
    }
}
