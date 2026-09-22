using System.Security.Claims;

namespace Acme.Users.Api.Auth;

public sealed class HeaderUserMiddleware
{
    private readonly RequestDelegate _next;
    public HeaderUserMiddleware(RequestDelegate next) => _next = next;
    public async Task Invoke(HttpContext context)
    {
        var role = context.Request.Headers["X-Role"].ToString();
        if (!string.IsNullOrEmpty(role))
        {
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role) }, "Header");
            context.User = new ClaimsPrincipal(identity);
        }
        await _next(context);
    }
}
