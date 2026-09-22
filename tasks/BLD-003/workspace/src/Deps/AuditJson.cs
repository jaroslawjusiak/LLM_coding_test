using Newtonsoft.Json;

namespace Deps;

public static class AuditJson
{
    public static string Write(object value) => JsonConvert.SerializeObject(value);
}
