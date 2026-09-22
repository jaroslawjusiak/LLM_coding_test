namespace Orders.Tests;

public class OrderHiddenTests
{
    [Fact]
    public void Behavior_is_locked()
    {
        Assert.Equal("ignored", new Orders.OrderProcessor().ProcessOrder(new Orders.Order { Items = null }).Outcome);
        Assert.Equal(0m, new Orders.OrderProcessor().ProcessOrder(new Orders.Order { Items = new() { new Orders.OrderLine { Price = 5, Quantity = -1 } } }).Total);
        Assert.Equal(99.99m, new Orders.OrderProcessor().ProcessOrder(new Orders.Order { Items = new() { new Orders.OrderLine { Price = 99.99m, Quantity = 1 } } }).Total);
    }
}
