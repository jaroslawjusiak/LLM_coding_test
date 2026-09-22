namespace CacheBug.Tests;

public class CacheHiddenTests
{
    [Fact]
    public async Task Stale_non_null_cache_entries_are_not_returned()
    {
        var db = new CacheBug.Database();
        var service = new CacheBug.UserService(new CacheBug.UserCache(), db);
        var user = await service.GetUserAsync(7);
        Assert.Equal("grace@example.com", user!.Email);
    }

    [Fact]
    public async Task A_second_read_does_not_hit_the_database()
    {
        var db = new CacheBug.Database();
        var service = new CacheBug.UserService(new CacheBug.UserCache(), db);
        await service.GetUserAsync(3);
        await service.GetUserAsync(3);
        Assert.Equal(1, db.Reads);
    }
}
