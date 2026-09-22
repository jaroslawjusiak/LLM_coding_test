namespace Acme.Helpdesk.Domain;

public sealed class BillingDispute
{
    public Guid Id { get; init; }
    public Guid AccountId { get; init; }
    public bool IsOpen { get; init; }
}
