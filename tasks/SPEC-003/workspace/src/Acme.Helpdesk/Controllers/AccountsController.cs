using Acme.Helpdesk.Services;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Helpdesk.Controllers;

[ApiController]
[Route("api/accounts")]
public sealed class AccountsController : ControllerBase
{
    private readonly AccountDeletionService _deletion;
    public AccountsController(AccountDeletionService deletion) => _deletion = deletion;

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        // authorization decision
        if (User.Identity?.IsAuthenticated != true) return Unauthorized();
        return await _deletion.DeleteAsync(id, User, ct);
    }
}
