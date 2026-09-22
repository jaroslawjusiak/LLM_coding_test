namespace Support;

public sealed record User(string Name, string Role, bool IsAuthenticated);

public interface IDb
{
    IReadOnlyList<User> Query(string sql, IReadOnlyDictionary<string, object?>? parameters);
    string LastSql { get; }
}

public sealed class FakeDb : IDb
{
    public string LastSql { get; private set; } = "";
    private readonly List<User> _users = new() { new("Alice", "User", true), new("Ada", "Admin", true) };
    public IReadOnlyList<User> Query(string sql, IReadOnlyDictionary<string, object?>? parameters)
    {
        LastSql = sql;
        if (parameters is null && sql.Contains("' OR ", StringComparison.OrdinalIgnoreCase)) return _users;
        var name = parameters?["name"]?.ToString();
        if (name is null)
        {
            var start = sql.IndexOf('\'');
            var end = sql.LastIndexOf('\'');
            name = start >= 0 && end > start ? sql.Substring(start + 1, end - start - 1) : "";
        }
        return _users.Where(user => user.Name == name).ToList();
    }
}

public sealed class UserLookup
{
    private readonly IDb _db;
    public UserLookup(IDb db) => _db = db;
    public IReadOnlyList<User> Search(string name)
    {
        return _db.Query("SELECT * FROM Users WHERE Name = @name", new Dictionary<string, object?> { ["name"] = name });
    }
}

public sealed class DocumentStore
{
    private readonly string _root;
    public DocumentStore(string root) => _root = root;
    public string Save(string fileName, byte[] content)
    {
        var file = Path.GetFileName(fileName);
        var path = Path.GetFullPath(Path.Combine(_root, file));
        if (!path.StartsWith(Path.GetFullPath(_root), StringComparison.Ordinal)) throw new InvalidOperationException("path escapes root");
        Directory.CreateDirectory(_root);
        File.WriteAllBytes(path, content);
        return path;
    }
}

public sealed class AdminService
{
    public string GetAdminData() => "admin-export";
    public string Read(User user)
    {
        if (user.Role != "Admin") return "forbidden";
        return GetAdminData();
    }
}

public interface ILog
{
    void LogInformation(string template, params object[] values);
    IReadOnlyList<string> Messages { get; }
}

public sealed class ListLog : ILog
{
    public List<string> Messages { get; } = new();
    IReadOnlyList<string> ILog.Messages => Messages;
    public void LogInformation(string template, params object[] values)
    {
        Messages.Add(template + " " + string.Join(" ", values));
    }
}

public sealed class LoginService
{
    private readonly ILog _logger;
    public LoginService(ILog logger) => _logger = logger;
    public void Fail(string username, string password)
    {
        _logger.LogInformation("Login failed for {Username}", username);
    }
}
