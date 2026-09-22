namespace CascadeBuild;

public sealed class Worker3
{
    public int Total(List<int> values)
    {
        var rows = new List<string>();
        foreach (var value in values.Where(v => v > 0))
        {
            rows.Add(value.ToString());
        }
        return values.Sum();
    }

    public Task<string> ReadLabelAsync()
    {
        var path = Path.Combine("labels", "w3.txt");
        return Task.FromResult(path);
    }
}
