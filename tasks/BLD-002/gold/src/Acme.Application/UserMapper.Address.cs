using Acme.Domain;

namespace Acme.Application;

public partial class UserMapper
{
    public string MapAddress(User user) => $"{user.Name}, {user.City}";
}
