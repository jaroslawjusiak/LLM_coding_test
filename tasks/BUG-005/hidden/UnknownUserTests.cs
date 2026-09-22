using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Users.Tests;

public class UnknownUserTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public UnknownUserTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Unknown_user_is_not_found()
    {
        var response = await _factory.CreateClient().GetAsync("/users/404");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
