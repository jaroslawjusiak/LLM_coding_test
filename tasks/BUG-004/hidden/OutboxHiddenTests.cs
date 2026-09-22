namespace Notify.Tests;

public class OutboxHiddenTests
{
    [Fact]
    public void Hosted_path_sends_exactly_once()
    {
        var email = new Notify.RecordingEmail();
        var outbox = new Notify.Outbox();
        new Notify.NotificationDispatcher(email, outbox).Dispatch(new Notify.Notification("n-2", "grace@example.com", "body"));
        Assert.Empty(email.Sent);
        new Notify.OutboxProcessor(email, outbox).Flush();
        Assert.Equal(1, email.Sent.Count);
        Assert.Equal("n-2", email.Sent[0].Id);
    }
}
