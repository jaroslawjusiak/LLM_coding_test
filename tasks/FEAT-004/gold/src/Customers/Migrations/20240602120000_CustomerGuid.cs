using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Customers.Migrations;

[DbContext(typeof(CustomerDb))]
[Migration("20240602120000_CustomerGuid")]
public class CustomerGuid : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("ALTER TABLE Customers RENAME TO Customers_old;");
        migrationBuilder.CreateTable(
            name: "Customers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                Name = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Customers", x => x.Id));
        migrationBuilder.Sql(@"
INSERT INTO Customers (Id, Name)
SELECT printf('%08x-0000-0000-0000-000000000000', Id), Name FROM Customers_old;");
        migrationBuilder.DropTable("Customers_old");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => throw new NotSupportedException();
}
