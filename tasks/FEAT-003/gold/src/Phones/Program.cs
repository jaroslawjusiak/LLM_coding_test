using Microsoft.EntityFrameworkCore;
using Phones;

var builder = WebApplication.CreateBuilder(args);
var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=phones.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(cs));
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}
app.MapGet("/api/users/{id:int}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(new { user.Id, user.Name, user.Phone });
});
app.MapPost("/api/users/{id:int}/phones", async (int id, PhoneBody body, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();
    db.UserPhoneNumbers.Add(new UserPhoneNumber { UserId = id, Number = body.Number, Kind = body.Kind });
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{id}/phones", body);
});
app.MapGet("/api/users/{id:int}/phones", async (int id, AppDbContext db) =>
    await db.UserPhoneNumbers.Where(p => p.UserId == id).Select(p => new { p.Number, p.Kind }).ToListAsync());

app.Run();
public partial class Program;
public sealed record PhoneBody(string Number, string Kind);
