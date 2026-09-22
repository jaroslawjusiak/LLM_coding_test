namespace Acme.Helpdesk.Domain;

public sealed class Webhook
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Webhook";
}
