using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Services;

public sealed class InactiveAccountCleanupJob
{
    private readonly IAccountRepository _repository;
    public InactiveAccountCleanupJob(IAccountRepository repository) => _repository = repository;

    public async Task DeleteInactiveAsync(Guid id, CancellationToken ct)
    {
        var account = await _repository.FindAsync(id, ct);
        if (account?.Status == AccountStatus.Suspended)
            await _repository.DeleteAsync(id, ct);
    }
}
