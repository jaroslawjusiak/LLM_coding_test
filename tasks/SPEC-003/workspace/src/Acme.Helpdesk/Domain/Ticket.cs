namespace Acme.Helpdesk.Domain;

public sealed class Ticket
{
    public Guid Id { get; init; }
    public Guid AccountId { get; init; }
    public string Subject { get; init; } = "";
}
