namespace OneError;

public sealed class CustomerRepository
{
    public Customer? Find(int id)
    {
        if (id != 7) return null;
        return new Customer { Id = 7, Name = "Ada" };
    }
}
