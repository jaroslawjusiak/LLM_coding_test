# WidgetKit 2.0

Breaking changes from 1.4:

- Namespace `WidgetKit` moved to `WidgetKit.Core`.
- `Widget.Create(string name)` was removed. Use `WidgetFactory.Create(new WidgetOptions { Name = name })`.
- `widget.Run()` was removed. Use `await widget.ExecuteAsync(cancellationToken)`.
- `WidgetException` was renamed to `WidgetFaultException`.
- Newtonsoft.Json 13.0.3 remains the supported serializer. Version 99.0.0 was never published.
