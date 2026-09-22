namespace Notify.Tests;

public class DuplicateEmailRegressionTests
{
    [Fact]
    public void Retry_flush_does_not_send_a_duplicate()
    {
        var email = new Notify.RecordingEmail();
        var outbox = new Notify.Outbox();
        new Notify.NotificationDispatcher(email, outbox).Dispatch(new Notify.Notification("n-9", "ada@example.com", "hello"));
        var processor = new Notify.OutboxProcessor(email, outbox);
        processor.Flush();
        processor.Flush();
        Assert.Single(email.Sent);
    }
}
