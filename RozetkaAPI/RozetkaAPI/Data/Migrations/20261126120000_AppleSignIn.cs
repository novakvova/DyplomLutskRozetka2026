using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RozetkaAPI.Data.Migrations
{
    public partial class AppleSignIn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppleSubject",
                table: "Users",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_AppleSubject",
                table: "Users",
                column: "AppleSubject",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_AppleSubject",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AppleSubject",
                table: "Users");
        }
    }
}
