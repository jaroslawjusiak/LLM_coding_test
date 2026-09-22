namespace Restraint.Tests;

public class DirectoryTests
{
    [Fact]
    public void Names_are_projected()
    {
        var names = new Restraint.UserDirectory().Names();
        Assert.Equal(new[] { "John", "Jane" }, names);
    }

    [Fact]
    public void Preferred_discount_keeps_current_results()
    {
        var directory = new Restraint.UserDirectory();
        Assert.Equal(0m, directory.PreferredDiscount(50));
        Assert.Equal(1m, directory.PreferredDiscount(150));
        Assert.Equal(2m, directory.PreferredDiscount(200));
    }
}
