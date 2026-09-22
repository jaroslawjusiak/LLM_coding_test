using Microsoft.EntityFrameworkCore;

namespace Phones;

public sealed class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public List<UserPhoneNumber> PhoneNumbers { get; } = new();
}

public sealed class UserPhoneNumber
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Number { get; set; } = "";
    public string Kind { get; set; } = "";
    public User? User { get; set; }
}

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users => Set<User>();
    public DbSet<UserPhoneNumber> UserPhoneNumbers => Set<UserPhoneNumber>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserPhoneNumber>().HasOne(p => p.User).WithMany(u => u.PhoneNumbers).HasForeignKey(p => p.UserId);
    }
}
