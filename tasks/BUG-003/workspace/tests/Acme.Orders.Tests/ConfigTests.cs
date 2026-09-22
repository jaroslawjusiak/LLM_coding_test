using Microsoft.Extensions.Configuration;

namespace Acme.Orders.Tests;

public class ConfigTests
{
    [Fact]
    public void Local_config_uses_localhost()
    {
        var config = Build(includeCompose: false);
        Assert.Contains("Host=localhost", Acme.Orders.AppConfig.ResolveOrdersConnection(config));
    }

    [Fact]
    public void Compose_environment_points_at_the_db_service()
    {
        var config = Build(includeCompose: true);
        Assert.Contains("Host=db", Acme.Orders.AppConfig.ResolveOrdersConnection(config));
    }

    private static IConfiguration Build(bool includeCompose)
    {
        var root = FindWorkspace();
        var builder = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(root, "src", "Acme.Orders"))
            .AddJsonFile("appsettings.json", optional: false);
        if (includeCompose)
        {
            builder.AddJsonFile("appsettings.Docker.json", optional: true);
            builder.AddInMemoryCollection(ReadComposeEnv(Path.Combine(root, "docker-compose.yml")));
        }
        return builder.Build();
    }

    private static Dictionary<string, string?> ReadComposeEnv(string path)
    {
        var values = new Dictionary<string, string?>();
        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (!line.Contains(':') || line.StartsWith("-") || line.StartsWith("image:") || line.StartsWith("build:") || line.EndsWith(":")) continue;
            var split = line.Split(':', 2);
            if (split.Length == 2 && split[0].Contains('_')) values[split[0].Trim().Replace("__", ":")] = split[1].Trim();
        }
        return values;
    }

    private static string FindWorkspace()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "docker-compose.yml"))) return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("workspace");
    }
}
