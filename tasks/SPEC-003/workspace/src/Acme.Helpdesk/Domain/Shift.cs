namespace Acme.Helpdesk.Domain;

public sealed class Shift
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Shift";
}
