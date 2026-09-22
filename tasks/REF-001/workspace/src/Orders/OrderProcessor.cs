namespace Orders;

public sealed class Order
{
    public string? Status { get; init; }
    public List<OrderLine>? Items { get; init; }
}

public sealed class OrderLine
{
    public decimal Price { get; init; }
    public int Quantity { get; init; }
}

public sealed class OrderResult
{
    public string Outcome { get; init; } = "ignored";
    public decimal Total { get; init; }
}

public sealed class OrderProcessor
{
    public OrderResult ProcessOrder(Order? order)
    {
        if (order != null)
        {
            if (order.Items != null)
            {
                if (order.Items.Count > 0)
                {
                    if (order.Status != "cancelled")
                    {
                        decimal total = 0;
                        foreach (var line in order.Items)
                        {
                            if (line.Quantity > 0)
                            {
                                total += line.Price * line.Quantity;
                            }
                        }
                        if (total >= 100)
                        {
                            total = total * 0.9m;
                        }
                        return new OrderResult { Outcome = "processed", Total = total };
                    }
                }
            }
        }
        return new OrderResult();
    }
}
