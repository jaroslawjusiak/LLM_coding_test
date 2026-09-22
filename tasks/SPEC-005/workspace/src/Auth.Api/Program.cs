var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<Auth.Api.UserDirectory>();
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
public partial class Program;
