using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Customers.Tests;

public class CustomerGuidTests
{
    [Fact]
    public void Integer_ids_are_preserved_as_guids()
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".db");
        var options = new DbContextOptionsBuilder<CustomerDb>().UseSqlite($"Data Source={path}").Options;
        using var db = new CustomerDb(options);
        var migrator = db.Database.GetService<IMigrator>()!;
        var migrations = db.Database.GetMigrations().ToList();
        Assert.True(migrations.Count >= 2);
        migrator.Migrate(migrations[0]);
        db.Database.ExecuteSqlRaw("INSERT INTO Customers (Name) VALUES ('Ada')");
        var connection = db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open) connection.Open();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT Id FROM Customers";
        var oldId = Convert.ToInt64(cmd.ExecuteScalar());
        migrator.Migrate(migrations[^1]);
        using var check = new SqliteConnection($"Data Source={path}");
        check.Open();
        using var cmd2 = check.CreateCommand();
        cmd2.CommandText = "SELECT Id FROM Customers";
        var stored = (string)cmd2.ExecuteScalar()!;
        Assert.Equal(new Guid(Convert.ToInt32(oldId), 0, 0, new byte[8]).ToString(), stored);
    }
}
