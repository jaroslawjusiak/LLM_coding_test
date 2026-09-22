namespace SyntaxRepair;

public class BadGeneric
{
    public System.Collections.Generic.List[string] Items()
    {
        return new System.Collections.Generic.List<string>();
    }
}
