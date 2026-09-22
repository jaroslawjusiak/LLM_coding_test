using Acme.Application;
using Acme.Domain;

namespace Acme.Tests;

public class BuildFixesTests
{
    [Fact]
    public void Notification_and_address_mapping_work()
    {
        Assert.Equal("sent:ada@example.com:order-ready", new OrderAppService().Notify("ada@example.com"));
        Assert.Equal("Ada, Lublin", new UserMapper().Map(new User { Name = "Ada", City = "Lublin" }));
    }
}
