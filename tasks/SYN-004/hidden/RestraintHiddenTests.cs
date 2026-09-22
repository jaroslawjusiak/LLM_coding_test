namespace Restraint.Tests;

public class RestraintHiddenTests
{
    [Fact]
    public void Integer_discount_behavior_is_preserved()
    {
        var directory = new Restraint.UserDirectory();
        Assert.Equal(0m, directory.PreferredDiscount(99));
        Assert.Equal(3m, directory.PreferredDiscount(399));
    }
}
