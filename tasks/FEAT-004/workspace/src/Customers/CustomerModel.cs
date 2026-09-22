using Microsoft.EntityFrameworkCore;

namespace Customers;

public sealed class Customer
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
}

public sealed class CustomerDb : DbContext
{
    public CustomerDb(DbContextOptions<CustomerDb> options) : base(options) { }
    public DbSet<Customer> Customers => Set<Customer>();
}
