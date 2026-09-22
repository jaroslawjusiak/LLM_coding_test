using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Cart.Tests;

public class EmptyCartHiddenTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public EmptyCartHiddenTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Empty_cart_body_is_an_array()
    {
        var response = await _factory.CreateClient().GetAsync("/api/carts/empty");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("[]", (await response.Content.ReadAsStringAsync()).Trim());
    }
}
