using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Users.Tests;

public class KnownUserTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public KnownUserTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Known_user_keeps_the_current_body()
    {
        var response = await _factory.CreateClient().GetAsync("/users/4");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ada@example.com", body);
        Assert.Contains("Active", body);
    }
}
