namespace Orders.Tests;

public class OrderTests
{
    [Fact]
    public void Behavior_is_locked()
    {
        var processor = new Orders.OrderProcessor();
        Assert.Equal("ignored", processor.ProcessOrder(null).Outcome);
        Assert.Equal("ignored", processor.ProcessOrder(new Orders.Order { Items = new() }).Outcome);
        Assert.Equal("ignored", processor.ProcessOrder(new Orders.Order { Status = "cancelled", Items = new() { new Orders.OrderLine { Price = 10, Quantity = 1 } } }).Outcome);
        Assert.Equal(90m, processor.ProcessOrder(new Orders.Order { Items = new() { new Orders.OrderLine { Price = 50, Quantity = 2 } } }).Total);
    }
}
