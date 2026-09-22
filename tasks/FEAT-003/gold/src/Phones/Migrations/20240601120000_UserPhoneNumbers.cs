using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Phones.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20240601120000_UserPhoneNumbers")]
public class UserPhoneNumbers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "UserPhoneNumbers",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false).Annotation("Sqlite:Autoincrement", true),
                UserId = table.Column<int>(type: "INTEGER", nullable: false),
                Number = table.Column<string>(type: "TEXT", nullable: false),
                Kind = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserPhoneNumbers", x => x.Id);
                table.ForeignKey("FK_UserPhoneNumbers_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.Sql("INSERT INTO UserPhoneNumbers (UserId, Number, Kind) SELECT Id, Phone, 'mobile' FROM Users WHERE Phone IS NOT NULL AND Phone <> '';");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("UserPhoneNumbers");
}
