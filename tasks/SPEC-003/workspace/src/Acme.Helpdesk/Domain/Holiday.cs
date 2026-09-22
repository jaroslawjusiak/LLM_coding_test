namespace Acme.Helpdesk.Domain;

public sealed class Holiday
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Holiday";
}
