namespace SyntaxRepair.Tests;

public class SyntaxTests
{
    [Fact]
    public void Samples_keep_their_behavior()
    {
        Assert.Equal(1, new SyntaxRepair.MissingSemicolon().Value());
        Assert.Equal("ab", new SyntaxRepair.MissingParen().Hello());
        Assert.Equal(3, new SyntaxRepair.MissingBrace().Plus(2));
        Assert.Equal(0, new SyntaxRepair.MissingBrace().Plus(0));
        Assert.Empty(new SyntaxRepair.BadGeneric().Items());
        Assert.Equal("kept", new SyntaxRepair.BadAttribute().Marked());
        Assert.Equal("hello", new SyntaxRepair.BadString().Text());
    }
}
