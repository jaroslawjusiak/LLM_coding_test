namespace Acme.Helpdesk.Authorization;

public sealed class AccountAccessPolicy
{
    public bool CanRead(string role) => role is "Agent" or "SupportAdmin" or "Owner";
}
