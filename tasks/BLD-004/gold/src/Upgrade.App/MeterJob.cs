using Newtonsoft.Json;
using WidgetKit.Core;

namespace Upgrade;

public sealed class MeterJob
{
    public async Task<string> RunAsync(string name)
    {
        var widget = WidgetFactory.Create(new WidgetOptions { Name = name });
        var body = JsonConvert.SerializeObject(new { widget = name });
        try
        {
            var ran = await widget.ExecuteAsync(CancellationToken.None);
            return ran;
        }
        catch (WidgetFaultException ex)
        {
            return ex.Message;
        }
        finally
        {
            _ = body.Length;
        }
    }
}
