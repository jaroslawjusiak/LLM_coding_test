using Acme.Users.Application.Users;
using Acme.Users.Domain;

namespace Acme.Users.Infrastructure;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly Dictionary<int, User> _users = UserSeed.Create();
    public User? Find(int id) => _users.GetValueOrDefault(id);
}
