using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Accounts;

public sealed class UserRecord
{
    public int Id { get; init; }
    public string Email { get; init; } = "";
    public string Status { get; set; } = "active";
}

public interface IUserStore
{
    UserRecord? Find(int id);
}

public sealed class InMemoryUserStore : IUserStore
{
    private readonly Dictionary<int, UserRecord> _users = new()
    {
        [4] = new UserRecord { Id = 4, Email = "ada@example.com", Status = "active" }
    };
    public UserRecord? Find(int id) => _users.GetValueOrDefault(id);
}

public sealed record AuditEntry(string Action, IReadOnlyDictionary<string, string> Data);

public interface IAuditLog
{
    void Write(string action, IReadOnlyDictionary<string, string> data);
    IReadOnlyList<AuditEntry> Entries { get; }
}

public sealed class InMemoryAuditLog : IAuditLog
{
    private readonly List<AuditEntry> _entries = new();
    public IReadOnlyList<AuditEntry> Entries => _entries;
    public void Write(string action, IReadOnlyDictionary<string, string> data) => _entries.Add(new AuditEntry(action, data));
}

public sealed class HeaderRoleMiddleware
{
    private readonly RequestDelegate _next;
    public HeaderRoleMiddleware(RequestDelegate next) => _next = next;
    public async Task Invoke(HttpContext context)
    {
        var role = context.Request.Headers["X-Role"].ToString();
        if (!string.IsNullOrEmpty(role))
        {
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role), new Claim(ClaimTypes.Name, "tester") }, "Header");
            context.User = new ClaimsPrincipal(identity);
        }
        await _next(context);
    }
}

public sealed record DeactivateRequest(string Reason);

[ApiController]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserStore _users;
    private readonly IAuditLog _audit;
    public UsersController(IUserStore users, IAuditLog audit)
    {
        _users = users;
        _audit = audit;
    }

    [HttpGet("{id:int}")]
    public IActionResult Get(int id)
    {
        var user = _users.Find(id);
        return user is null ? NotFound() : Ok(new { user.Id, user.Email, user.Status });
    }

    [HttpPost("{id:int}/deactivation")]
    public IActionResult Deactivate(int id, [FromBody] DeactivateRequest? request)
    {
        if (!User.IsInRole("Admin")) return StatusCode(403);
        if (request is null || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 500) return BadRequest();
        var user = _users.Find(id);
        if (user is null) return NotFound();
        if (user.Status == "deactivated") return Conflict();
        user.Status = "deactivated";
        _audit.Write("user.deactivated", new Dictionary<string, string> { ["userId"] = id.ToString(), ["reason"] = request.Reason });
        return NoContent();
    }
}

[ApiController]
[Route("api/audit")]
public sealed class AuditController : ControllerBase
{
    private readonly IAuditLog _audit;
    public AuditController(IAuditLog audit) => _audit = audit;
    [HttpGet]
    public IActionResult Get() => Ok(_audit.Entries);
}
