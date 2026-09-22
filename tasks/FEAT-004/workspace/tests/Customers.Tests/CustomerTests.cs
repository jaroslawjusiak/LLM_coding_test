namespace Customers.Tests;

public class CustomerTests
{
    [Fact]
    public void Cache_remembers_an_integer_id()
    {
        var cache = new Customers.CustomerCache();
        cache.Remember(7, "Ada");
        Assert.Equal("Ada", cache.Find(7));
    }
}
