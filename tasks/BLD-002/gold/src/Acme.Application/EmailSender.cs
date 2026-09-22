namespace Acme.Infrastructure.Email;

public sealed class EmailSender
{
    public string Send(string to, string body) => $"sent:{to}:{body}";
}
