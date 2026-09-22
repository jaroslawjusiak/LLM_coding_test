namespace Acme.Users.Domain;

public sealed class EmailAddress
{
    public string Value { get; }
    private EmailAddress(string value) => Value = value;
    public static EmailAddress Parse(string value) => new(value);
}
