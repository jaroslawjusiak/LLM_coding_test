namespace Phones.Tests;

public class UserTests
{
    [Fact]
    public void User_still_has_a_name()
    {
        var user = new Phones.User { Name = "Ada" };
        Assert.Equal("Ada", user.Name);
    }
}
