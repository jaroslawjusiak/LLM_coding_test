namespace Billing.Tests;

public class BillingTests
{
    [Fact]
    public void Standard_invoice_matches_current_total()
    {
        var total = new Billing.BillingProcessor().Total(new Billing.Invoice { Region = "EU", Subtotal = 200, TaxExempt = false });
        Assert.Equal(207m, total);
    }
}
