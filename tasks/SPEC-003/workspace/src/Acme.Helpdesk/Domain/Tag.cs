namespace Acme.Helpdesk.Domain;

public sealed class Tag
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Tag";
}
