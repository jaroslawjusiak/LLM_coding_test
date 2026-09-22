namespace Acme.Helpdesk.Domain;

public sealed class AllowAllAccountGuard
{
    public bool CanDelete(Guid accountId) => true;
}
