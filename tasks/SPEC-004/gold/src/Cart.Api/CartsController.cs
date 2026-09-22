using Microsoft.AspNetCore.Mvc;

namespace Cart.Api;

[ApiController]
[Route("api/carts")]
public sealed class CartsController : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(string id)
    {
        if (id == "empty")
        {
            return Ok(Array.Empty<object>());
        }
        return Ok(new[] { new { sku = "pen", quantity = 1 } });
    }
}
