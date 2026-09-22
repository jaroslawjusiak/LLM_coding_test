using Acme.Users.Domain;

namespace Acme.Users.Application.Users;

public sealed class UserReader : IUserReader
{
    private readonly IUserRepository _repository;
    public UserReader(IUserRepository repository) => _repository = repository;
    public UserSummary? Find(int id)
    {
        var user = _repository.Find(id);
        if (user is null) return null;
        return new UserSummary(user.Id, user.Email.Value, user.Status.ToString());
    }
}

public interface IUserRepository
{
    User? Find(int id);
}
