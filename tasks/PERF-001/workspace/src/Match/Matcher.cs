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
        var results = new List<UserOrders>();
        foreach (var user in users)
        {
            decimal total = 0;
            foreach (var order in orders)
            {
                if (order.UserId == user.Id && order.Status == Status.Active) total += order.Total;
            }
            results.Add(new UserOrders(user.Id, total));
        }
        return results;
    }
}
