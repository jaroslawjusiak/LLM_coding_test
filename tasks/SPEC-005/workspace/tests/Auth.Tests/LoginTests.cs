using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Auth.Tests;

public class LoginTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public LoginTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Known_user_can_log_in()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/session/login", new { email = "ada@example.com", password = "correct-password" });
        response.EnsureSuccessStatusCode();
    }
}
