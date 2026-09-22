namespace Customers;

public sealed class CustomerCache
{
    private readonly Dictionary<Guid, string> _names = new();
    public void Remember(Guid id, string name) => _names[id] = name;
    public string? Find(Guid id) => _names.GetValueOrDefault(id);
}
