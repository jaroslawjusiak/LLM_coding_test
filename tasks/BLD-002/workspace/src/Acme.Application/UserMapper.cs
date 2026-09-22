using Acme.Domain;

namespace Acme.Application;

public partial class UserMapper
{
    public string Map(User user) => MapAddress(user);
}
