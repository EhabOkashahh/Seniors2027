using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seniors2027.DAL.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSpotifyColumnsSafely : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyAccessToken') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP COLUMN [SpotifyAccessToken];
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyRefreshToken') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP COLUMN [SpotifyRefreshToken];
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyTokenExpiresAtUtc') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP COLUMN [SpotifyTokenExpiresAtUtc];
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyConnectedAtUtc') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP COLUMN [SpotifyConnectedAtUtc];
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyAccessToken') IS NULL
                BEGIN
                    ALTER TABLE [Users] ADD [SpotifyAccessToken] nvarchar(2048) NULL;
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyRefreshToken') IS NULL
                BEGIN
                    ALTER TABLE [Users] ADD [SpotifyRefreshToken] nvarchar(2048) NULL;
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyTokenExpiresAtUtc') IS NULL
                BEGIN
                    ALTER TABLE [Users] ADD [SpotifyTokenExpiresAtUtc] datetime2 NULL;
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('dbo.Users', 'SpotifyConnectedAtUtc') IS NULL
                BEGIN
                    ALTER TABLE [Users] ADD [SpotifyConnectedAtUtc] datetime2 NULL;
                END
                """);
        }
    }
}
