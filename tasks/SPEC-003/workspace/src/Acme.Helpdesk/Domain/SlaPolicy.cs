namespace Acme.Helpdesk.Domain;

public sealed class SlaPolicy
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "SlaPolicy";
}
