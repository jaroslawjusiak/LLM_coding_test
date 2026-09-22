namespace Acme.Helpdesk.Legacy;

public static class LegacyAccountEndpoints
{
    public static bool CanDelete(bool isAuthenticated) => isAuthenticated;
}
