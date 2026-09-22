namespace Match;

public enum Status { Active, Cancelled }

public sealed class User
{
    public int Id { get; init; }
}

public class Order
{
    public virtual int UserId { get; init; }
    public Status Status { get; init; }
    public decimal Total { get; init; }
}

public sealed record UserOrders(int UserId, decimal Total);

public sealed class Matcher
{
    public IReadOnlyList<UserOrders> MatchOrders(IReadOnlyList<User> users, IReadOnlyList<Order> orders)
    {
        var grouped = orders.Where(order => order.Status == Status.Active).GroupBy(order => order.UserId).ToDictionary(g => g.Key, g => g.Sum(order => order.Total));
        return users.Select(user => new UserOrders(user.Id, grouped.GetValueOrDefault(user.Id))).ToList();
    }
}
