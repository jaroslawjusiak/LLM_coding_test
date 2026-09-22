namespace SyntaxRepair;

public class BadAttribute
{
    [System.Obsolete("old")]
    public string Marked() => "kept";
}
