using Acme.Application;

namespace Acme.Api;

public static class EntryPoint
{
    public static string Run() => new OrderAppService().Notify("ada@example.com");
}
