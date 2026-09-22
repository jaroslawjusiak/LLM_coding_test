using System.Security.Claims;
using Acme.Helpdesk.Domain;

namespace Acme.Helpdesk.Authorization;

public interface IAccountDeletionAuthorizer
{
    Task<AuthorizationDecision> AuthorizeAsync(ClaimsPrincipal user, Account account, CancellationToken ct);
}

public sealed record AuthorizationDecision(bool Allowed, string Reason)
{
    public static AuthorizationDecision Allow() => new(true, "");
    public static AuthorizationDecision Deny(string reason) => new(false, reason);
}
