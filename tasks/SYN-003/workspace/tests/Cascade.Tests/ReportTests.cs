namespace Cascade.Tests;

public class ReportTests
{
    [Fact]
    public void Totals_are_stable()
    {
        var report = new Cascade.ReportBuilder();
        Assert.Equal(10, report.Line(0));
        Assert.Equal(55, report.SumThrough(10));
        Assert.Equal("ok", report.Label(true));
    }
}
