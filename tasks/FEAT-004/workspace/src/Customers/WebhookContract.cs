namespace Customers;

public sealed class CustomerWebhook
{
    public int CustomerId { get; init; }
    public string EventName { get; init; } = "customer.changed";
}
