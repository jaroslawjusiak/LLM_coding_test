namespace Billing;

public sealed class Invoice
{
    public string Region { get; init; } = "";
    public decimal Subtotal { get; init; }
    public bool TaxExempt { get; init; }
}

public sealed class BillingProcessor
{
    public decimal Total(Invoice invoice) => BillingRules.Total(invoice);
}
