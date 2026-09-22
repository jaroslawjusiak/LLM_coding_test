using Microsoft.Extensions.Configuration;

namespace Acme.Orders;

public static class AppConfig
{
    public static string ResolveOrdersConnection(IConfiguration config) =>
        config.GetConnectionString("Orders")
        ?? throw new InvalidOperationException("Missing Orders connection string.");
}
