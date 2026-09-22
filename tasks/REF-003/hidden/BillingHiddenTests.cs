namespace Billing.Tests;

public class BillingHiddenTests
{
    [Fact]
    public void Exempt_and_small_invoices_keep_current_rules()
    {
        var processor = new Billing.BillingProcessor();
        Assert.Equal(180m, processor.Total(new Billing.Invoice { Region = "EU", Subtotal = 200, TaxExempt = true }));
        Assert.Equal(53m, processor.Total(new Billing.Invoice { Region = "US", Subtotal = 50, TaxExempt = false }));
        Assert.Equal(0m, processor.Total(new Billing.Invoice { Region = "US", Subtotal = 0, TaxExempt = false }));
    }
}
