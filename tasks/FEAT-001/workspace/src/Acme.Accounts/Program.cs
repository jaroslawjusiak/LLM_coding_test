using Acme.Accounts;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IUserStore, InMemoryUserStore>();
builder.Services.AddSingleton<IAuditLog, InMemoryAuditLog>();
var app = builder.Build();
app.UseMiddleware<HeaderRoleMiddleware>();
app.MapControllers();
app.Run();
public partial class Program;
