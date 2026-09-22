using Acme.Users.Domain;

namespace Acme.Users.Infrastructure;

public static class UserSeed
{
    public static Dictionary<int, User> Create() => new()
    {
        [4] = new User { Id = 4, Email = EmailAddress.Parse("ada@example.com"), Status = UserStatus.Active }
    };
}
