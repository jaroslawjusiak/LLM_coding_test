namespace Notifications;

public sealed record Subscription(string UserId, string Channel, string Address);
public sealed record DeliveryAttempt(string UserId, string Address, bool Success);

public interface IEmailSender
{
    void Send(string address, string body);
}

public sealed class FakeEmail : IEmailSender
{
    public List<string> Sent { get; } = new();
    public void Send(string address, string body) => Sent.Add($"{address}:{body}");
}

public sealed class SmsChannel
{
    public void Send(string phone, string body) => throw new NotSupportedException(phone + body);
}

public sealed class NotificationService
{
    private readonly IEmailSender _email;
    private readonly List<Subscription> _subs = new();
    public List<DeliveryAttempt> Attempts { get; } = new();

    public NotificationService(IEmailSender email) => _email = email;

    public void Subscribe(string userId, string channel, string address)
    {
        if (channel != "email") throw new NotSupportedException("Only email is supported.");
        _subs.Add(new Subscription(userId, channel, address));
    }

    public void Send(string userId, string body)
    {
        foreach (var sub in _subs.Where(s => s.UserId == userId))
        {
            try
            {
                _email.Send(sub.Address, body);
                Attempts.Add(new DeliveryAttempt(userId, sub.Address, true));
            }
            catch
            {
                // failed attempts are not recorded and are not retried
            }
        }
    }
}
