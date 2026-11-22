using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;
using Xunit;

namespace RozetkaAPI.Tests;

public class BuyerApiTests : IAsyncLifetime
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
    public async Task Register_rejects_duplicate_email()
    {
        var body = RegisterBody("buyer@example.com");
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync("/api/auth/register", body)).StatusCode);

        var repeat = await _client.PostAsJsonAsync("/api/auth/register", body);
        Assert.Equal(HttpStatusCode.Conflict, repeat.StatusCode);
    }

    [Fact]
    public async Task Login_rejects_blocked_user()
    {
        const string email = "blocked@example.com";
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync("/api/auth/register", RegisterBody(email))).StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await database.Users.SingleAsync(item => item.Email == email);
            user.IsBlocked = true;
            await database.SaveChangesAsync();
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new { email, password = "Buyer12345" });
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);
    }

    [Fact]
    public async Task Forgot_password_returns_link_when_smtp_is_empty()
    {
        const string email = "reset@example.com";
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync("/api/auth/register", RegisterBody(email))).StatusCode);

        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<MessageBody>();
        Assert.Contains("/reset-password?token=", body?.ResetUrl, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Add_to_cart_increases_quantity_instead_of_resetting_it()
    {
        var (client, productId) = await AuthorizedClientWithProduct("cart@example.com", stock: 5);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/cart", new { productId })).StatusCode);
        var second = await client.PostAsJsonAsync("/api/cart", new { productId });
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var cart = await second.Content.ReadFromJsonAsync<CartBody>();
        Assert.Equal(2, cart?.Items.Single().Quantity);
    }

    [Fact]
    public async Task Catalog_search_matches_name()
    {
        await AuthorizedClientWithProduct("search@example.com", stock: 4);
        var response = await _client.GetAsync("/api/products?query=Тестовий&sort=name");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var products = await response.Content.ReadFromJsonAsync<List<ProductJson>>();
        Assert.Contains(products!, item => item.Name.Contains("Тестовий", StringComparison.OrdinalIgnoreCase));

        var empty = await _client.GetFromJsonAsync<List<ProductJson>>("/api/products?query=неіснуючий-товар");
        Assert.Empty(empty!);
    }

    [Fact]
    public async Task Price_filter_hides_products_outside_the_range()
    {
        await AuthorizedClientWithProduct("filter@example.com", stock: 3);
        var matched = await _client.GetFromJsonAsync<List<ProductJson>>("/api/products?query=Тестовий&minPrice=100&maxPrice=100");
        Assert.NotEmpty(matched!);
        var none = await _client.GetFromJsonAsync<List<ProductJson>>("/api/products?query=Тестовий&maxPrice=10");
        Assert.Empty(none!);
    }

    [Fact]
    public async Task Review_needs_a_purchase_and_demo_card_payment_is_explicit()
    {
        var (client, productId) = await AuthorizedClientWithProduct("pay@example.com", stock: 4);
        var tooEarly = await client.PostAsJsonAsync($"/api/products/{productId}/reviews", new
        {
            rating = 5,
            text = "Дуже хороший товар для дому"
        });
        Assert.Equal(HttpStatusCode.BadRequest, tooEarly.StatusCode);

        await SetCart(client, productId, 1);
        var orderResponse = await client.PostAsJsonAsync("/api/orders", new
        {
            recipientName = "Олена Коваль",
            phone = "+380671234567",
            city = "Луцьк",
            deliveryMethod = "nova_poshta",
            deliveryAddress = "Відділення 3",
            paymentMethod = "card"
        });
        var order = await orderResponse.Content.ReadFromJsonAsync<OrderBody>();
        Assert.Equal("AwaitingPayment", order!.Status);

        var pay = await client.PostAsync($"/api/orders/{order.Id}/pay", null);
        Assert.Equal(HttpStatusCode.OK, pay.StatusCode);
        var paid = await pay.Content.ReadFromJsonAsync<PaymentJson>();
        Assert.Equal("demo", paid!.Mode);
        Assert.Equal("Processing", paid.Order!.Status);

        var review = await client.PostAsJsonAsync($"/api/products/{productId}/reviews", new
        {
            rating = 5,
            text = "Дуже хороший товар для дому"
        });
        Assert.Equal(HttpStatusCode.OK, review.StatusCode);

        var cities = await _client.GetFromJsonAsync<List<CityJson>>("/api/delivery/cities?query=Луц");
        Assert.Contains(cities!, city => city.Name == "Луцьк");
    }

    [Fact]
    public async Task Checkout_reduces_stock_and_cancel_returns_it()
    {
        var (client, productId) = await AuthorizedClientWithProduct("stock@example.com", stock: 2);
        await SetCart(client, productId, 2);

        var created = await client.PostAsJsonAsync("/api/orders", CheckoutBody());
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var order = await created.Content.ReadFromJsonAsync<OrderBody>();
        Assert.Equal("New", order?.Status);
        Assert.Equal(0, await Stock(productId));

        var cancelled = await client.PostAsync($"/api/orders/{order!.Id}/cancel", null);
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.Equal("Cancelled", (await cancelled.Content.ReadFromJsonAsync<OrderBody>())?.Status);
        Assert.Equal(2, await Stock(productId));

        var again = await client.PostAsync($"/api/orders/{order.Id}/cancel", null);
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    [Fact]
    public async Task Checkout_rejects_when_stock_dropped_after_cart()
    {
        var (client, productId) = await AuthorizedClientWithProduct("short@example.com", stock: 2);
        await SetCart(client, productId, 2);

        using (var scope = _factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = await database.Products.SingleAsync(item => item.Id == productId);
            product.Stock = 1;
            await database.SaveChangesAsync();
        }

        var created = await client.PostAsJsonAsync("/api/orders", CheckoutBody());
        Assert.Equal(HttpStatusCode.BadRequest, created.StatusCode);
        Assert.Equal(1, await Stock(productId));
        Assert.Equal(0, await OrdersFor(productId));
    }

    private async Task<(HttpClient Client, int ProductId)> AuthorizedClientWithProduct(string email, int stock)
    {
        var registered = await _client.PostAsJsonAsync("/api/auth/register", RegisterBody(email));
        var auth = await registered.Content.ReadFromJsonAsync<AuthBody>();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        int productId;
        using (var scope = _factory.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var category = await database.Categories.FirstOrDefaultAsync()
                ?? database.Categories.Add(new Category { Name = "Тестова категорія" }).Entity;
            await database.SaveChangesAsync();
            var product = new Product
            {
                CategoryId = category.Id,
                Name = "Тестовий товар",
                ShortDescription = "Для перевірки складу",
                FullDescription = "Повний опис тестового товару для каталогу.",
                Price = 100,
                Stock = stock,
                CreatedAt = DateTime.UtcNow
            };
            database.Products.Add(product);
            await database.SaveChangesAsync();
            productId = product.Id;
        }

        return (client, productId);
    }

    private static async Task SetCart(HttpClient client, int productId, int quantity)
    {
        var response = await client.PutAsJsonAsync("/api/cart", new { productId, quantity });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<int> Stock(int productId)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await database.Products.Where(item => item.Id == productId).Select(item => item.Stock).SingleAsync();
    }

    private async Task<int> OrdersFor(int productId)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await database.OrderItems.CountAsync(item => item.ProductId == productId);
    }

    private static object RegisterBody(string email) => new
    {
        email,
        password = "Buyer12345",
        firstName = "Олена",
        lastName = "Коваль"
    };

    private static object CheckoutBody() => new
    {
        recipientName = "Олена Коваль",
        phone = "+380671234567",
        city = "Луцьк",
        deliveryMethod = "nova_poshta",
        deliveryAddress = "Відділення 3",
        paymentMethod = "cash_on_delivery"
    };

    private sealed record AuthBody(string AccessToken);
    private sealed record MessageBody(string Message, string? ResetUrl);
    private sealed record OrderBody(int Id, string Status);
    private sealed record CartBody(List<CartLineBody> Items);
    private sealed record CartLineBody(int Quantity);
    private sealed record ProductJson(int Id, string Name);
    private sealed record PaymentJson(string Mode, OrderBody? Order);
    private sealed record CityJson(string Name);
}

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"rozetka-tests-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Database:ApplyMigrations", "false");
        builder.UseSetting("Database:Sqlite", $"Data Source={_databasePath}");
        builder.UseSetting("Auth:ExposeResetLink", "true");
        builder.UseSetting("Smtp:Host", "");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try
        {
            File.Delete(_databasePath);
        }
        catch (IOException)
        {
        }
    }
}
