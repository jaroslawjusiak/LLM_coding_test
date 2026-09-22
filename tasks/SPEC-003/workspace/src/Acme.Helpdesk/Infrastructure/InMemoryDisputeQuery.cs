using Acme.Helpdesk.Authorization;

namespace Acme.Helpdesk.Infrastructure;

public sealed class InMemoryDisputeQuery : IDisputeQuery
{
    public Task<bool> HasOpenDisputeAsync(Guid accountId, CancellationToken ct) => Task.FromResult(false);
}
