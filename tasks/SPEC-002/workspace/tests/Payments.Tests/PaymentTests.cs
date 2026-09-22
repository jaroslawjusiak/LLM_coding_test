namespace Payments.Tests;

public class PaymentTests
{
    [Fact]
    public async Task Should_not_charge_cancelled_order()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "p1", Status = Payments.OrderStatus.Cancelled, Amount = 10 });
        Assert.False(result.ChargedSuccessfully);
        Assert.Empty(gateway.Calls);
    }

    [Fact]
    public async Task Should_retry_payment_three_times()
    {
        var gateway = new FakeGateway { FailuresBeforeSuccess = 3 };
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "p2", Amount = 10 });
        Assert.False(result.ChargedSuccessfully);
        Assert.Equal(3, gateway.Calls.Count);
    }

    [Fact]
    public async Task Should_charge_a_normal_order()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "p3", Amount = 12.5m });
        Assert.True(result.ChargedSuccessfully);
        Assert.Equal(new[] { "p3" }, gateway.Calls);
    }
}

public sealed class FakeGateway : Payments.IPaymentGateway
{
    public int FailuresBeforeSuccess { get; init; }
    public List<string> Calls { get; } = new();
    public Task ChargeAsync(string paymentId, decimal amount, CancellationToken ct)
    {
        Calls.Add(paymentId);
        if (Calls.Count <= FailuresBeforeSuccess) throw new Payments.TransientPaymentException("down");
        return Task.CompletedTask;
    }
}

public sealed class Ledger : Payments.IPaymentLedger
{
    private readonly HashSet<string> _ids = new();
    public bool Has(string paymentId) => _ids.Contains(paymentId);
    public void Record(string paymentId) => _ids.Add(paymentId);
}
