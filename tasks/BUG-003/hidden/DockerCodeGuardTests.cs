using System.Security.Cryptography;
using System.Text;

namespace Acme.Orders.Tests;

public class DockerCodeGuardTests
{
    [Fact]
    public void Application_code_was_not_the_defect()
    {
        var source = File.ReadAllText(Find("src/Acme.Orders/AppConfig.cs"));
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(source.Replace("\r", "")))).ToLowerInvariant();
        Assert.Equal("3a50846c568f40e314280420c2ed47a4f99396ec162b17cba69c267e97b2e1e5", hash);
    }

    private static string Find(string relative)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, relative.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException(relative);
    }
}
