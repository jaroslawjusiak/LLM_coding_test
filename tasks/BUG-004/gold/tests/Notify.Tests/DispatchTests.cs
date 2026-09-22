namespace Notify.Tests;

public class DispatchTests
{
    [Fact]
    public void Dispatch_enqueues_and_the_processor_sends_once()
    {
        var email = new Notify.RecordingEmail();
        var outbox = new Notify.Outbox();
        var dispatcher = new Notify.NotificationDispatcher(email, outbox);
        dispatcher.Dispatch(new Notify.Notification("n-1", "ada@example.com", "hello"));
        Assert.Empty(email.Sent);
        new Notify.OutboxProcessor(email, outbox).Flush();
        Assert.Single(email.Sent);
    }
}
