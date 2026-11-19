using System.Net;
using System.Net.Mail;
using RozetkaAPI.Common;

namespace RozetkaAPI.Services;

public class ResetMailer(IConfiguration configuration, ILogger<ResetMailer> logger)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(configuration["Smtp:Host"]);

    public async Task SendAsync(string email, string resetUrl, CancellationToken cancellationToken)
    {
        var host = configuration["Smtp:Host"] ?? "";
        var port = configuration.GetValue("Smtp:Port", 587);
        var user = configuration["Smtp:User"];
        var password = configuration["Smtp:Password"];
        var from = configuration["Smtp:From"];
        if (string.IsNullOrWhiteSpace(from))
            from = string.IsNullOrWhiteSpace(user) ? "noreply@localhost" : user;

        using var message = new MailMessage(from, email)
        {
            Subject = "Відновлення пароля",
            Body = $"Щоб задати новий пароль, відкрийте посилання. Воно діє одну годину:\n{resetUrl}"
        };

#pragma warning disable SYSLIB0014
        using var client = new SmtpClient(host, port);
        client.EnableSsl = configuration.GetValue("Smtp:Ssl", true);
        client.Timeout = 15000;
        if (!string.IsNullOrWhiteSpace(user))
            client.Credentials = new NetworkCredential(user, password);
#pragma warning restore SYSLIB0014

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Не вдалося надіслати лист для відновлення пароля на {Email}", email);
            throw new AppException(StatusCodes.Status503ServiceUnavailable, "Не вдалося надіслати лист. Спробуйте ще раз.");
        }
    }
}
