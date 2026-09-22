namespace Notify.Tests;

public class DispatchTests
{
    [Fact]
    public void Dispatch_sends_the_template()
    {
        var email = new Notify.RecordingEmail();
        var dispatcher = new Notify.NotificationDispatcher(email, new Notify.Outbox());
        dispatcher.Dispatch(new Notify.Notification("n-1", "ada@example.com", "hello"));
        Assert.Contains(email.Sent, message => message.Id == "n-1");
    }
}
