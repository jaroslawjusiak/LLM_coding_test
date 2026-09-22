using Customers;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<CustomerDb>(options => options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=customers.db"));
builder.Services.AddSingleton<CustomerCache>();
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<CustomerDb>().Database.Migrate();
}
app.MapGet("/api/customers/{id:guid}", async (Guid id, CustomerDb db, ILoggerFactory logs) =>
{
    var customer = await db.Customers.FindAsync(id);
    logs.CreateLogger("Customers").LogInformation("Loaded customer {CustomerId}", id);
    return customer is null ? Results.NotFound() : Results.Ok(customer);
});
app.Run();
public partial class Program;
