namespace Support.Tests;

public class SecurityHiddenTests
{
    [Fact]
    public void Injection_payload_is_not_concatenated()
    {
        var db = new Support.FakeDb();
        var lookup = new Support.UserLookup(db);
        var payload = "Robert' OR '1'='1";
        Assert.Empty(lookup.Search(payload));
        Assert.DoesNotContain(payload, db.LastSql);
    }

    [Fact]
    public void Upload_cannot_escape_the_root()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var saved = new Support.DocumentStore(root).Save("../secret.txt", "x"u8.ToArray());
        Assert.StartsWith(Path.GetFullPath(root), Path.GetFullPath(saved));
    }

    [Fact]
    public void Authenticated_user_does_not_receive_admin_data()
    {
        var result = new Support.AdminService().Read(new Support.User("Alice", "User", true));
        Assert.Equal("forbidden", result);
    }

    [Fact]
    public void Password_is_not_logged()
    {
        var log = new Support.ListLog();
        new Support.LoginService(log).Fail("ada", "S3cret!");
        Assert.DoesNotContain(log.Messages, message => message.Contains("S3cret!"));
    }
}
