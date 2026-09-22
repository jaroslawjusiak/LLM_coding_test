using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Acme.Accounts.Tests;

public class ExistingTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public ExistingTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Known_user_is_readable()
    {
        var response = await _factory.CreateClient().GetAsync("/api/users/4");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
