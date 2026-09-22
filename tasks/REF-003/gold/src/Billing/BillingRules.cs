namespace Billing;

public static class BillingRules
{
    public static decimal Total(Invoice invoice)
    {
        if (invoice == null || invoice.Subtotal < 0) return 0;
        var discountRate = invoice.Subtotal >= 100
            ? invoice.Region switch { "EU" => 0.10m, "US" => 0.05m, _ => 0.02m }
            : 0m;
        var discounted = invoice.Subtotal - invoice.Subtotal * discountRate;
        var taxRate = invoice.TaxExempt ? 0m : invoice.Region switch { "EU" => 0.15m, "US" => 0.06m, _ => 0.08m };
        return decimal.Round(discounted + discounted * taxRate, 2, MidpointRounding.AwayFromZero);
    }
}
