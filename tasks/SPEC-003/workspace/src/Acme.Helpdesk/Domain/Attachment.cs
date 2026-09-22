namespace Acme.Helpdesk.Domain;

public sealed class Attachment
{
    public Guid Id { get; init; }
    public string Label { get; init; } = "Attachment";
}
