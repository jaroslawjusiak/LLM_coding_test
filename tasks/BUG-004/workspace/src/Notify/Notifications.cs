namespace Notify;

public sealed record Notification(string Id, string To, string Body);

public sealed class RecordingEmail
{
    public List<Notification> Sent { get; } = new();
    public void Send(Notification note) => Sent.Add(note);
}

public sealed class Outbox
{
    private readonly Queue<Notification> _pending = new();
    public void Enqueue(Notification note) => _pending.Enqueue(note);
    public bool TryDequeue(out Notification? note) => _pending.TryDequeue(out note);
}

public sealed class NotificationDispatcher
{
    private readonly RecordingEmail _email;
    private readonly Outbox _outbox;
    public NotificationDispatcher(RecordingEmail email, Outbox outbox)
    {
        _email = email;
        _outbox = outbox;
    }

    public void Dispatch(Notification note)
    {
        _email.Send(note);
        _outbox.Enqueue(note);
    }
}

public sealed class OutboxProcessor
{
    private readonly RecordingEmail _email;
    private readonly Outbox _outbox;
    private readonly HashSet<string> _sent = new();
    public OutboxProcessor(RecordingEmail email, Outbox outbox)
    {
        _email = email;
        _outbox = outbox;
    }

    public void Flush()
    {
        while (_outbox.TryDequeue(out var note) && note is not null)
        {
            if (!_sent.Add(note.Id)) continue;
            _email.Send(note);
        }
    }
}
