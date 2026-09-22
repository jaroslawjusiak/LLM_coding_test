namespace Acme.Users.Infrastructure;

public sealed class SystemClock
{
    public DateTimeOffset UtcNow() => DateTimeOffset.UtcNow;
}
