using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;

namespace Phones.Tests;

public class PhoneMigrationTests
{
    [Fact]
    public void Migration_backfills_the_legacy_phone_column()
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".db");
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite($"Data Source={path}").Options;
        using var db = new AppDbContext(options);
        var migrator = db.Database.GetService<IMigrator>()!;
        var migrations = db.Database.GetMigrations().ToList();
        Assert.True(migrations.Count >= 2, "expected a new migration");
        migrator.Migrate(migrations[0]);
        db.Database.ExecuteSqlRaw("INSERT INTO Users (Name, Phone) VALUES ('Ada', '555-0100')");
        migrator.Migrate(migrations[^1]);
        using var check = new SqliteConnection($"Data Source={path}");
        check.Open();
        using var cmd = check.CreateCommand();
        cmd.CommandText = "SELECT Number, Kind FROM UserPhoneNumbers";
        using var reader = cmd.ExecuteReader();
        Assert.True(reader.Read());
        Assert.Equal("555-0100", reader.GetString(0));
        Assert.Equal("mobile", reader.GetString(1));
    }
}

public class PhoneApiTests : IClassFixture<PhoneFactory>
{
    private readonly PhoneFactory _factory;
    public PhoneApiTests(PhoneFactory factory) => _factory = factory;

    [Fact]
    public async Task Can_add_two_phone_numbers()
    {
        var client = _factory.CreateClient();
        int id;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new User { Name = "Grace" });
            await db.SaveChangesAsync();
            id = db.Users.Single().Id;
        }
        Assert.Equal(System.Net.HttpStatusCode.Created, (await client.PostAsJsonAsync($"/api/users/{id}/phones", new { number = "1", kind = "mobile" })).StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Created, (await client.PostAsJsonAsync($"/api/users/{id}/phones", new { number = "2", kind = "work" })).StatusCode);
        var body = await client.GetStringAsync($"/api/users/{id}/phones");
        Assert.Contains("work", body);
        Assert.Contains("mobile", body);
    }
}

public sealed class PhoneFactory : WebApplicationFactory<Program>
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".db");
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_path}");
    }
}
