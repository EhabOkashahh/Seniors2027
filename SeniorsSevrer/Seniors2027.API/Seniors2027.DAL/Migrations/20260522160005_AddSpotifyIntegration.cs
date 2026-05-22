using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddSpotifyIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SpotifyAccessToken",
                table: "Users",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SpotifyConnectedAtUtc",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpotifyRefreshToken",
                table: "Users",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SpotifyTokenExpiresAtUtc",
                table: "Users",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SpotifyAccessToken",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyConnectedAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyRefreshToken",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SpotifyTokenExpiresAtUtc",
                table: "Users");
        }
    }
}
