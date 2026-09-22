using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Cart.Tests;

public class CartTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public CartTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Empty_cart_status()
    {
        var response = await _factory.CreateClient().GetAsync("/api/carts/empty");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Stocked_cart_is_ok()
    {
        var response = await _factory.CreateClient().GetAsync("/api/carts/stocked");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
