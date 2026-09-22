using Acme.Helpdesk.Authorization;
using Acme.Helpdesk.Infrastructure;
using Acme.Helpdesk.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddSingleton<IAccountRepository, InMemoryAccountRepository>();
builder.Services.AddSingleton<IDisputeQuery, InMemoryDisputeQuery>();
builder.Services.AddSingleton<IAccountDeletionAuthorizer, AccountDeletionAuthorizationHandler>();
builder.Services.AddSingleton<AccountDeletionService>();
builder.Services.AddSingleton<AccountAccessPolicy>();
var app = builder.Build();
app.MapControllers();
app.Run();
