namespace Support.Tests;

public class HappyPathTests
{
    [Fact]
    public void Alice_can_be_found_and_a_file_can_be_saved()
    {
        var db = new Support.FakeDb();
        var lookup = new Support.UserLookup(db);
        Assert.Equal("Alice", lookup.Search("Alice")[0].Name);
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var saved = new Support.DocumentStore(root).Save("note.txt", "hello"u8.ToArray());
        Assert.StartsWith(root, saved);
    }
}
