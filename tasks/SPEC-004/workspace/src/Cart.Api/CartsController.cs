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
            return BadRequest(new { error = "cart is empty" });
        }
        return Ok(new[] { new { sku = "pen", quantity = 1 } });
    }
}
