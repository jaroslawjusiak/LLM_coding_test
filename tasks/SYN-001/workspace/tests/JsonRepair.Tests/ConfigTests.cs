using System.Text.Json.Nodes;

namespace JsonRepair.Tests;

public class ConfigTests
{
    [Fact]
    public void Appsettings_has_the_original_document()
    {
        var path = Find("appsettings.json");
        var doc = JsonNode.Parse(File.ReadAllText(path))!.AsObject();
        Assert.Equal(3, doc.Count);
        Assert.Equal("test", doc["name"]!.GetValue<string>());
        Assert.Equal("1.0.0", doc["version"]!.GetValue<string>());
        var deps = doc["dependencies"]!.AsObject();
        Assert.Equal(1, deps.Count);
        Assert.Equal("1.2.3", deps["foo"]!.GetValue<string>());
    }

    private static string Find(string name)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, name);
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException(name);
    }
}
