using System.Security.Claims;
using Acme.Helpdesk.Authorization;
using Acme.Helpdesk.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Helpdesk.Services;

public sealed class AccountDeletionService
{
    private readonly IAccountRepository _repository;
    private readonly IAccountDeletionAuthorizer _authorizer;
    public AccountDeletionService(IAccountRepository repository, IAccountDeletionAuthorizer authorizer)
    {
        _repository = repository;
        _authorizer = authorizer;
    }

    public async Task<IActionResult> DeleteAsync(Guid id, ClaimsPrincipal user, CancellationToken ct)
    {
        var account = await _repository.FindAsync(id, ct);
        if (account is null) return new NotFoundResult();
        var decision = await _authorizer.AuthorizeAsync(user, account, ct);
        if (!decision.Allowed) return new ObjectResult(decision.Reason) { StatusCode = StatusCodes.Status403Forbidden };
        await _repository.DeleteAsync(id, ct);
        return new NoContentResult();
    }
}

public interface IAccountRepository
{
    Task<Account?> FindAsync(Guid id, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}
