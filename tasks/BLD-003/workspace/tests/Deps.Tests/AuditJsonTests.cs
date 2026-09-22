namespace Deps.Tests;

public class AuditJsonTests
{
    [Fact]
    public void Serializes_a_payload()
    {
        Assert.Contains("Ada", Deps.AuditJson.Write(new { Name = "Ada" }));
    }
}
