namespace Restraint;

public sealed class User
{
    public string Name { get; init; } = "";
}

public sealed class UserDirectory
{
    public List<string> Names()
    {
        var users = new List<User>
        {
            new User { Name = "John" },
            new User { Name = "Jane" }
        };
        return users.Select(x => x.Name).ToList((
    }

    public decimal PreferredDiscount(int points) => points / 100;
}
