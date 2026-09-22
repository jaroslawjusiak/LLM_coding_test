namespace WidgetKit.Core;

public sealed class WidgetOptions
{
    public string Name { get; init; } = "";
}

public sealed class Widget
{
    public string Name { get; }
    public Widget(string name) => Name = name;
    public Task<string> ExecuteAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult($"ran:{Name}");
    }
}

public static class WidgetFactory
{
    public static Widget Create(WidgetOptions options) => new(options.Name);
}

public sealed class WidgetFaultException : Exception
{
    public WidgetFaultException(string message) : base(message) { }
}
