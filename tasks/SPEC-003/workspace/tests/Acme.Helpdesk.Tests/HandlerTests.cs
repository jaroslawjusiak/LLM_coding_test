using System.Security.Claims;
using Acme.Helpdesk.Authorization;
using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Tests;

public class HandlerTests
{
    [Fact]
    public async Task Open_dispute_blocks_deletion()
    {
        var handler = new AccountDeletionAuthorizationHandler(new AlwaysDisputed());
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "owner") }, "test"));
        var decision = await handler.AuthorizeAsync(user, new Account { Id = Guid.NewGuid(), OwnerUserId = "owner" }, CancellationToken.None);
        Assert.False(decision.Allowed);
        Assert.Contains("dispute", decision.Reason, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class AlwaysDisputed : IDisputeQuery
    {
        public Task<bool> HasOpenDisputeAsync(Guid accountId, CancellationToken ct) => Task.FromResult(true);
    }
}
