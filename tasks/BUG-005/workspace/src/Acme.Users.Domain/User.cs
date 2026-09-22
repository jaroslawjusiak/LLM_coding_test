namespace Acme.Users.Domain;

public sealed class User
{
    public int Id { get; init; }
    public EmailAddress Email { get; init; } = EmailAddress.Parse("none@example.com");
    public UserStatus Status { get; init; } = UserStatus.Active;
}

public enum UserStatus { Active, Invited, Disabled }
