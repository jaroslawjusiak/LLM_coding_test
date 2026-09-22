using Acme.Users.Application.Users;
using Microsoft.AspNetCore.Mvc;

namespace Acme.Users.Api.Controllers;

[ApiController]
[Route("users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserReader _reader;
    public UsersController(IUserReader reader) => _reader = reader;

    [HttpGet("{id:int}")]
    public ActionResult<UserSummary> Get(int id)
    {
        var user = _reader.Find(id);
        return Ok(new UserSummary(user.Id, user.Email, user.Status));
    }
}
