using Acme.Infrastructure.Email;

namespace Acme.Application;

public sealed class OrderAppService
{
    private readonly EmailSender _email = new();

    public string Notify(string to) => _email.Send(to, "order-ready");
}
