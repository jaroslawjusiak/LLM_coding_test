using Acme.Helpdesk.Domain;
using Acme.Helpdesk.Services;

namespace Acme.Helpdesk.Infrastructure;

public sealed class InMemoryAccountRepository : IAccountRepository
{
    private readonly Dictionary<Guid, Account> _accounts = new();
    public Task<Account?> FindAsync(Guid id, CancellationToken ct) => Task.FromResult(_accounts.GetValueOrDefault(id));
    public Task DeleteAsync(Guid id, CancellationToken ct)
    {
        _accounts.Remove(id);
        return Task.CompletedTask;
    }
}
