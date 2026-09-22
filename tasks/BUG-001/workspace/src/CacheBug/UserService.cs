namespace CacheBug;

public sealed class User
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Email { get; init; }
}

public sealed class Database
{
    public int Reads { get; private set; }
    private readonly Dictionary<int, User> _rows = new()
    {
        [42] = new User { Id = 42, Name = "Ada", Email = "ada@example.com" },
        [7] = new User { Id = 7, Name = "Grace", Email = "grace@example.com" },
        [3] = new User { Id = 3, Name = "Lin", Email = "lin@example.com" }
    };

    public Task<User?> GetUserAsync(int id)
    {
        Reads++;
        return Task.FromResult(_rows.GetValueOrDefault(id));
    }
}

public sealed class UserCache
{
    private readonly Dictionary<int, User> _entries = new()
    {
        [42] = new User { Id = 42, Name = "Ada", Email = null },
        [7] = new User { Id = 7, Name = "Grace", Email = "grace.old@example.com" }
    };

    public Task<User?> GetAsync(int id) => Task.FromResult(_entries.GetValueOrDefault(id));

    public Task SetAsync(int id, User user)
    {
        _entries[id] = user;
        return Task.CompletedTask;
    }
}

public sealed class UserService
{
    private readonly UserCache _cache;
    private readonly Database _database;

    public UserService(UserCache cache, Database database)
    {
        _cache = cache;
        _database = database;
    }

    public async Task<User?> GetUserAsync(int id)
    {
        var cached = await _cache.GetAsync(id);
        if (cached is not null) return cached;
        return await LoadAndCache(id);
    }

    private async Task<User?> LoadAndCache(int id)
    {
        var user = await _database.GetUserAsync(id);
        if (user is not null) await _cache.SetAsync(id, user);
        return user;
    }
}
