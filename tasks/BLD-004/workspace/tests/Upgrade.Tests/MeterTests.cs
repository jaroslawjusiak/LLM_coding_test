namespace Upgrade.Tests;

public class MeterTests
{
    [Fact]
    public async Task Runs_the_named_widget()
    {
        Assert.Equal("ran:meter", await new Upgrade.MeterJob().RunAsync("meter"));
    }
}
