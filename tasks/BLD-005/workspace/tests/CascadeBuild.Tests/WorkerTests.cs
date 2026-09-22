namespace CascadeBuild.Tests;

public class WorkerTests
{
    [Fact]
    public void Workers_sum_their_slots()
    {
        Assert.Equal(3, new CascadeBuild.Worker1().Total(new List<int> { 1, 2 }));
        Assert.Equal(8, new CascadeBuild.Worker8().Total(new List<int> { 3, 5 }));
    }
}
