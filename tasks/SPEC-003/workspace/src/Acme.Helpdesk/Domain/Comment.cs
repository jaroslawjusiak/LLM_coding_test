namespace Acme.Helpdesk.Domain;

public sealed class Comment
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Comment";
}
