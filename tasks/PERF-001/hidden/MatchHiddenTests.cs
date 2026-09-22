namespace Match.Tests;

public class MatchHiddenTests
{
    [Fact]
    public void Does_not_read_every_order_for_every_user()
    {
        var users = Enumerable.Range(0, 400).Select(i => new Match.User { Id = i }).ToList();
        var orders = Enumerable.Range(0, 4000).Select(i => (Match.Order)new CountingOrder { UserIdValue = i % 400, Status = Match.Status.Active, Total = 1 }).ToList();
        CountingOrder.Reads = 0;
        new Match.Matcher().MatchOrders(users, orders);
        Assert.True(CountingOrder.Reads < orders.Count * 5, $"reads={CountingOrder.Reads}");
    }

    private sealed class CountingOrder : Match.Order
    {
        public static int Reads;
        public int UserIdValue { get; init; }
        public override int UserId { get { Reads++; return UserIdValue; } }
    }
}
