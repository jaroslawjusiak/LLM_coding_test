namespace Payments.Tests;

public class PaymentHiddenTests
{
    [Fact]
    public async Task Null_order_is_rejected()
    {
        var service = new Payments.PaymentService(new FakeGateway(), new Ledger());
        await Assert.ThrowsAsync<ArgumentNullException>(() => service.ChargeAsync(null!));
    }

    [Fact]
    public async Task Duplicate_payment_id_is_not_charged_twice()
    {
        var gateway = new FakeGateway();
        var ledger = new Ledger();
        var service = new Payments.PaymentService(gateway, ledger);
        var order = new Payments.Order { PaymentId = "dup", Amount = 4 };
        await service.ChargeAsync(order);
        await service.ChargeAsync(order);
        Assert.Single(gateway.Calls);
    }

    [Fact]
    public async Task Zero_amount_is_not_charged()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        await service.ChargeAsync(new Payments.Order { PaymentId = "z", Amount = 0 });
        Assert.Empty(gateway.Calls);
    }

    [Fact]
    public async Task Large_amount_is_charged()
    {
        var gateway = new FakeGateway();
        var service = new Payments.PaymentService(gateway, new Ledger());
        var result = await service.ChargeAsync(new Payments.Order { PaymentId = "big", Amount = 1000000.50m });
        Assert.True(result.ChargedSuccessfully);
    }
}
