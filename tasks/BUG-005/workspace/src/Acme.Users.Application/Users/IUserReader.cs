namespace Acme.Users.Application.Users;

public interface IUserReader
{
    UserSummary? Find(int id);
}
