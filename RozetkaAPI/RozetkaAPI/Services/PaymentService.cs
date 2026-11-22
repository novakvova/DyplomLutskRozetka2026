using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class PaymentService(IConfiguration configuration)
{
    public bool LiqPayConfigured =>
        !string.IsNullOrWhiteSpace(configuration["LiqPay:PublicKey"])
        && !string.IsNullOrWhiteSpace(configuration["LiqPay:PrivateKey"]);

    public (string Data, string Signature) CreateCheckout(CustomerOrder order)
    {
        var payload = new Dictionary<string, object?>
        {
            ["public_key"] = configuration["LiqPay:PublicKey"],
            ["version"] = 3,
            ["action"] = "pay",
            ["amount"] = order.Total.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
            ["currency"] = "UAH",
            ["description"] = $"Замовлення №{order.Id}",
            ["order_id"] = order.Id.ToString(),
            ["result_url"] = $"{configuration["Auth:FrontendUrl"]?.TrimEnd('/')}/orders/{order.Id}"
        };
        var callback = configuration["LiqPay:CallbackUrl"];
        if (!string.IsNullOrWhiteSpace(callback))
            payload["server_url"] = callback;

        var data = Convert.ToBase64String(JsonSerializer.SerializeToUtf8Bytes(payload));
        return (data, Sign(data));
    }

    public bool SignatureMatches(string? data, string? signature)
    {
        if (string.IsNullOrWhiteSpace(data) || string.IsNullOrWhiteSpace(signature) || !LiqPayConfigured)
            return false;
        var expected = Sign(data);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature));
    }

    public int? OrderIdFromData(string data)
    {
        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(data));
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("order_id", out var orderId)
                && int.TryParse(orderId.GetString(), out var id))
                return id;
        }
        catch (FormatException)
        {
        }
        catch (JsonException)
        {
        }

        return null;
    }

    public string? StatusFromData(string data)
    {
        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(data));
            using var document = JsonDocument.Parse(json);
            return document.RootElement.TryGetProperty("status", out var status) ? status.GetString() : null;
        }
        catch (FormatException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private string Sign(string data)
    {
        var privateKey = configuration["LiqPay:PrivateKey"] ?? "";
        var hash = SHA1.HashData(Encoding.UTF8.GetBytes(privateKey + data + privateKey));
        return Convert.ToBase64String(hash);
    }
}
