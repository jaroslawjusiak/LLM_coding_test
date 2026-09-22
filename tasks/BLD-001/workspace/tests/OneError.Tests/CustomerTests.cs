namespace OneError.Tests;

public class CustomerTests
{
    [Fact]
    public void Finds_the_seeded_customer()
    {
        var customer = new OneError.CustomerRepository().Find(7);
        Assert.NotNull(customer);
        Assert.Equal("Ada", customer.Name);
    }
}
