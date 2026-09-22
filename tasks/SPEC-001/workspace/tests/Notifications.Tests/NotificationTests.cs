namespace Notifications.Tests;

public class NotificationTests
{
    [Fact]
    public void Email_subscribe_and_send_records_success()
    {
        var email = new Notifications.FakeEmail();
        var service = new Notifications.NotificationService(email);
        service.Subscribe("u1", "email", "ada@example.com");
        service.Send("u1", "hello");
        Assert.Equal(new[] { "ada@example.com:hello" }, email.Sent);
        Assert.Single(service.Attempts);
    }
}
