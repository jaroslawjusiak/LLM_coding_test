namespace Acme.Helpdesk.Domain;

public sealed class Account
{
    public Guid Id { get; init; }
    public string OwnerUserId { get; init; } = "";
    public string Name { get; init; } = "";
    public AccountStatus Status { get; init; } = AccountStatus.Active;
}

public enum AccountStatus { Active, Suspended, Closed }
