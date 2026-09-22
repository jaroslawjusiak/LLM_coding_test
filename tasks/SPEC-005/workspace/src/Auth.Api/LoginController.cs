using Microsoft.AspNetCore.Mvc;

namespace Auth.Api;

public sealed class UserDirectory
{
    public bool Exists(string email) => email == "ada@example.com";
}

[ApiController]
[Route("api/session")]
public sealed class LoginController : ControllerBase
{
    private readonly UserDirectory _users;
    public LoginController(UserDirectory users) => _users = users;

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (!_users.Exists(request.Email) || request.Password != "correct-password") return Unauthorized();
        return Ok(new { token = "session-token" });
    }
}

public sealed record LoginRequest(string Email, string Password);
