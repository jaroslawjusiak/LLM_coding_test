namespace Customers;

public sealed class CustomerWebhook
{
    public Guid CustomerId { get; init; }
    public string EventName { get; init; } = "customer.changed";
}
