using System.Security.Claims;
using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Authorization;

public sealed class AccountDeletionAuthorizationHandler : IAccountDeletionAuthorizer
{
    private readonly IDisputeQuery _disputes;
    public AccountDeletionAuthorizationHandler(IDisputeQuery disputes) => _disputes = disputes;

    public async Task<AuthorizationDecision> AuthorizeAsync(ClaimsPrincipal user, Account account, CancellationToken ct)
    {
        var isOwner = user.FindFirstValue(ClaimTypes.NameIdentifier) == account.OwnerUserId;
        var isSupportAdmin = user.IsInRole("SupportAdmin");
        if (!isOwner && !isSupportAdmin)
            return AuthorizationDecision.Deny("Only the owner or a SupportAdmin can delete an account.");
        if (await _disputes.HasOpenDisputeAsync(account.Id, ct))
            return AuthorizationDecision.Deny("Accounts with an open billing dispute cannot be deleted.");
        return AuthorizationDecision.Allow();
    }
}

public interface IDisputeQuery
{
    Task<bool> HasOpenDisputeAsync(Guid accountId, CancellationToken ct);
}
