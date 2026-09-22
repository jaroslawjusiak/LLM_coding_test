namespace Customers.Tests;

public class CustomerTests
{
    [Fact]
    public void Cache_remembers_a_guid_id()
    {
        var cache = new Customers.CustomerCache();
        var id = new Guid(7, 0, 0, new byte[8]);
        cache.Remember(id, "Ada");
        Assert.Equal("Ada", cache.Find(id));
    }
}
