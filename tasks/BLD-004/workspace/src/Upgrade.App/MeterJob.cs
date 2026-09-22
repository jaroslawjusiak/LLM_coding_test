using Newtonsoft.Json;
using WidgetKit;

namespace Upgrade;

public sealed class MeterJob
{
    public string Run(string name)
    {
        var widget = Widget.Create(name);
        var body = JsonConvert.SerializeObject(new { widget = name });
        try
        {
            return widget.Run() + body.Length;
        }
        catch (WidgetException ex)
        {
            return ex.Message;
        }
    }
}
