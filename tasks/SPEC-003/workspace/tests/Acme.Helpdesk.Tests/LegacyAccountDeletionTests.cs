namespace Acme.Helpdesk.Tests;

public class LegacyAccountDeletionTests
{
    [Fact]
    public void Legacy_helper_checks_authentication_only()
    {
        Assert.False(Acme.Helpdesk.Legacy.LegacyAccountEndpoints.CanDelete(false));
        Assert.True(Acme.Helpdesk.Legacy.LegacyAccountEndpoints.CanDelete(true));
    }
}
