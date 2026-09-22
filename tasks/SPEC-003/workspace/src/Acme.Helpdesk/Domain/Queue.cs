namespace Acme.Helpdesk.Domain;

public sealed class Queue
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Queue";
}
