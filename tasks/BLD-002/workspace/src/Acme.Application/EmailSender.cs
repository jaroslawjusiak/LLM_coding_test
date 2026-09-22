namespace Acme.Mail;

public sealed class EmailSender
{
    public string Send(string to, string body) => $"sent:{to}:{body}";
}
