namespace CacheBug.Tests;

public class UserServiceTests
{
    [Fact]
    public async Task GetUser_returns_the_database_email()
    {
        var db = new CacheBug.Database();
        var service = new CacheBug.UserService(new CacheBug.UserCache(), db);
        var user = await service.GetUserAsync(42);
        Assert.NotNull(user);
        Assert.Equal(42, user.Id);
        Assert.Equal("ada@example.com", user.Email);
    }
}
