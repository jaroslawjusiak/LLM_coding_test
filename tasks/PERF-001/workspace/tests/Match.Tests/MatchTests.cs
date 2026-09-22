namespace Match.Tests;

public class MatchTests
{
    [Fact]
    public void Matches_active_orders()
    {
        var users = new List<Match.User> { new() { Id = 1 }, new() { Id = 2 } };
        var orders = new List<Match.Order>
        {
            new() { UserId = 1, Status = Match.Status.Active, Total = 5 },
            new() { UserId = 1, Status = Match.Status.Cancelled, Total = 9 },
            new() { UserId = 2, Status = Match.Status.Active, Total = 4 }
        };
        var matched = new Match.Matcher().MatchOrders(users, orders);
        Assert.Equal(5, matched[0].Total);
        Assert.Equal(4, matched[1].Total);
    }
}
