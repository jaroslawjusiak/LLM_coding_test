namespace Customers;

public sealed class CustomerCache
{
    private readonly Dictionary<int, string> _names = new();
    public void Remember(int id, string name) => _names[id] = name;
    public string? Find(int id) => _names.GetValueOrDefault(id);
}
