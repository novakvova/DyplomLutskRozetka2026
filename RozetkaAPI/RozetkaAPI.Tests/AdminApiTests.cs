using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;
using Xunit;

namespace RozetkaAPI.Tests;

public class AdminApiTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await database.Database.EnsureCreatedAsync();
        _client = _factory.CreateClient();
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        _factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task Buyer_cannot_manage_catalog_but_admin_can_and_cancel_restores_stock()
    {
        var buyer = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "buyer-admin@example.com",
            password = "Buyer12345",
            firstName = "Олена",
            lastName = "Коваль"
        });
        var buyerAuth = await buyer.Content.ReadFromJsonAsync<AuthBody>();
        var buyerClient = Client(buyerAuth!.AccessToken);

        var forbidden = await buyerClient.PostAsJsonAsync("/api/admin/products", ProductBody("Закритий", 10));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        int adminId;
        using (var scope = _factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await database.Users.SingleAsync(item => item.Email == "buyer-admin@example.com");
            user.Role = UserRole.Admin;
            adminId = user.Id;
            await database.SaveChangesAsync();
        }

        var adminClient = Client(buyerAuth.AccessToken);
        var created = await adminClient.PostAsJsonAsync("/api/admin/products", ProductBody("Адмінський товар", 3));
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var product = await created.Content.ReadFromJsonAsync<ProductJson>();

        await buyerClient.PutAsJsonAsync("/api/cart", new { productId = product!.Id, quantity = 1 });
        var orderResponse = await buyerClient.PostAsJsonAsync("/api/orders", new
        {
            recipientName = "Олена Коваль",
            phone = "+380671234567",
            city = "Луцьк",
            deliveryMethod = "nova_poshta",
            deliveryAddress = "Відділення 3",
            paymentMethod = "cash_on_delivery"
        });
        var order = await orderResponse.Content.ReadFromJsonAsync<OrderBody>();
        Assert.Equal(HttpStatusCode.OK, orderResponse.StatusCode);

        var status = await adminClient.PutAsJsonAsync($"/api/admin/orders/{order!.Id}/status", new { status = "Cancelled" });
        Assert.Equal(HttpStatusCode.OK, status.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(3, await database.Products.Where(item => item.Id == product.Id).Select(item => item.Stock).SingleAsync());
        }

        var self = await adminClient.PutAsJsonAsync($"/api/admin/users/{adminId}/blocked", new { isBlocked = true });
        Assert.Equal(HttpStatusCode.BadRequest, self.StatusCode);
    }

    private HttpClient Client(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static object ProductBody(string name, int stock) => new
    {
        name,
        shortDescription = "Короткий опис для адмінки",
        price = 150,
        stock
    };

    private sealed record AuthBody(string AccessToken);
    private sealed record ProductJson(int Id, int Stock);
    private sealed record OrderBody(int Id);
}
