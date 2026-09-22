using Acme.Users.Application.Users;
using Acme.Users.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
builder.Services.AddSingleton<IUserReader, UserReader>();
var app = builder.Build();
app.MapControllers();
app.Run();

public partial class Program;
