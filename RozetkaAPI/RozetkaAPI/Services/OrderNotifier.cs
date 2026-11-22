using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class OrderNotifier(ResetMailer mailer, ILogger<OrderNotifier> logger)
{
    public async Task NotifyStatusAsync(CustomerOrder order, CancellationToken cancellationToken)
    {
        if (!mailer.IsConfigured || string.IsNullOrWhiteSpace(order.User?.Email))
            return;

        var status = order.Status switch
        {
            OrderStatus.New => "Нове",
            OrderStatus.AwaitingPayment => "Очікує оплату",
            OrderStatus.Processing => "В обробці",
            OrderStatus.Completed => "Виконано",
            OrderStatus.Cancelled => "Скасовано",
            _ => order.Status.ToString()
        };
        var body = $"Статус замовлення №{order.Id} змінено на «{status}». Сума: {order.Total:0.00} грн.";
        try
        {
            await mailer.SendPlainAsync(order.User.Email, $"Замовлення №{order.Id}: {status}", body, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Не вдалося надіслати лист про замовлення {OrderId}", order.Id);
        }
    }
}
