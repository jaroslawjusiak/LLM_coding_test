namespace Acme.Helpdesk.Domain;

public sealed class Invoice
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Invoice";
}
