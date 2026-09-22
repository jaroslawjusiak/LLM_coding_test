namespace Payments;

public enum OrderStatus { Open, Cancelled }

public sealed class Order
{
    public string PaymentId { get; init; } = "";
    public OrderStatus Status { get; init; }
    public decimal Amount { get; init; }
}

public sealed class TransientPaymentException : Exception
{
    public TransientPaymentException() { }
    public TransientPaymentException(string message) : base(message) { }
}

public interface IPaymentGateway
{
    Task ChargeAsync(string paymentId, decimal amount, CancellationToken ct);
}

public interface IPaymentLedger
{
    bool Has(string paymentId);
    void Record(string paymentId);
}

public sealed class PaymentResult
{
    public bool ChargedSuccessfully { get; init; }
    public int Attempts { get; init; }
    public static PaymentResult Charged(int attempts) => new() { ChargedSuccessfully = true, Attempts = attempts };
    public static PaymentResult Skipped() => new();
    public static PaymentResult Failed(Exception error) => new() { Attempts = 3 };
}

public sealed class PaymentService
{
    private readonly IPaymentGateway _gateway;
    private readonly IPaymentLedger _ledger;
    public PaymentService(IPaymentGateway gateway, IPaymentLedger ledger)
    {
        _gateway = gateway;
        _ledger = ledger;
    }

    public async Task<PaymentResult> ChargeAsync(Order order, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(order);
        if (order.Status == OrderStatus.Cancelled || order.Amount <= 0)
            return PaymentResult.Skipped();
        if (_ledger.Has(order.PaymentId))
            return PaymentResult.Skipped();
        Exception? last = null;
        for (var attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                await _gateway.ChargeAsync(order.PaymentId, order.Amount, ct);
                _ledger.Record(order.PaymentId);
                return PaymentResult.Charged(attempt);
            }
            catch (TransientPaymentException ex)
            {
                last = ex;
            }
        }
        return PaymentResult.Failed(last!);
    }
}
