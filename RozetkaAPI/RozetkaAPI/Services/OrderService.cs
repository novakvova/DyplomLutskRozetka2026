using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class OrderService(AppDbContext db, PaymentService payments, OrderNotifier notifier)
{
    private static readonly HashSet<string> DeliveryMethods = ["nova_poshta", "ukrposhta", "pickup"];
    private static readonly HashSet<string> PaymentMethods = ["cash_on_delivery", "card"];

    public async Task<IReadOnlyList<OrderResponse>> ListAsync(int userId, CancellationToken cancellationToken)
    {
        var orders = await Query(userId).ToListAsync(cancellationToken);
        return orders.Select(Map).ToList();
    }

    public async Task<OrderResponse> GetAsync(int userId, int orderId, CancellationToken cancellationToken)
    {
        var order = await Query(userId).SingleOrDefaultAsync(item => item.Id == orderId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Замовлення не знайдено.");
        return Map(order);
    }

    public async Task<OrderResponse> CheckoutAsync(int userId, CheckoutRequest request, CancellationToken cancellationToken)
    {
        var recipient = InputRules.RequiredText(request.RecipientName, "Ім’я отримувача", 80);
        if (recipient.Length < 2)
            throw new AppException(StatusCodes.Status400BadRequest, "Ім’я отримувача має містити щонайменше 2 символи.");

        var phone = InputRules.Phone(request.Phone, required: true)!;
        var city = InputRules.RequiredText(request.City, "Місто", 80);
        var address = InputRules.RequiredText(request.DeliveryAddress, "Адреса або відділення", 200);
        var comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        if (comment is { Length: > 500 })
            throw new AppException(StatusCodes.Status400BadRequest, "Коментар має містити до 500 символів.");

        if (!DeliveryMethods.Contains(request.DeliveryMethod))
            throw new AppException(StatusCodes.Status400BadRequest, "Оберіть спосіб доставки.");
        if (!PaymentMethods.Contains(request.PaymentMethod))
            throw new AppException(StatusCodes.Status400BadRequest, "Оберіть спосіб оплати.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var cart = await db.CartItems
            .Include(item => item.Product)
            .Where(item => item.UserId == userId)
            .OrderBy(item => item.Id)
            .ToListAsync(cancellationToken);

        if (cart.Count == 0)
            throw new AppException(StatusCodes.Status400BadRequest, "Кошик порожній.");

        foreach (var item in cart)
        {
            if (item.Quantity > item.Product.Stock)
                throw new AppException(StatusCodes.Status400BadRequest, $"«{item.Product.Name}» закінчився на складі. Оновіть кошик.");
        }

        var order = new CustomerOrder
        {
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            Status = request.PaymentMethod == "card" ? OrderStatus.AwaitingPayment : OrderStatus.New,
            RecipientName = recipient,
            Phone = phone,
            City = city,
            DeliveryMethod = request.DeliveryMethod,
            DeliveryAddress = address,
            PaymentMethod = request.PaymentMethod,
            Comment = comment,
            Total = cart.Sum(item => item.Product.Price * item.Quantity),
            Items = cart.Select(item => new OrderItem
            {
                ProductId = item.ProductId,
                ProductName = item.Product.Name,
                UnitPrice = item.Product.Price,
                Quantity = item.Quantity
            }).ToList()
        };

        foreach (var item in cart)
            item.Product.Stock -= item.Quantity;

        db.Orders.Add(order);
        db.CartItems.RemoveRange(cart);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Map(order);
    }

    public async Task<OrderResponse> CancelAsync(int userId, int orderId, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var claimed = await db.Orders
            .Where(item => item.Id == orderId && item.UserId == userId
                && (item.Status == OrderStatus.New || item.Status == OrderStatus.AwaitingPayment))
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, OrderStatus.Cancelled), cancellationToken);

        if (claimed == 0)
        {
            var exists = await db.Orders.AnyAsync(item => item.Id == orderId && item.UserId == userId, cancellationToken);
            throw new AppException(
                exists ? StatusCodes.Status400BadRequest : StatusCodes.Status404NotFound,
                exists ? "Це замовлення вже не можна скасувати." : "Замовлення не знайдено.");
        }

        await RestoreStockAsync(orderId, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var cancelled = await db.Orders.Include(item => item.User).Include(item => item.Items)
            .SingleAsync(item => item.Id == orderId, cancellationToken);
        await notifier.NotifyStatusAsync(cancelled, cancellationToken);
        return Map(cancelled);
    }

    public async Task<PaymentStartResponse> PayAsync(int userId, int orderId, CancellationToken cancellationToken)
    {
        var order = await db.Orders
            .Include(item => item.User)
            .Include(item => item.Items)
            .SingleOrDefaultAsync(item => item.Id == orderId && item.UserId == userId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Замовлення не знайдено.");
        if (order.PaymentMethod != "card")
            throw new AppException(StatusCodes.Status400BadRequest, "Це замовлення не оплачується карткою.");
        if (order.Status != OrderStatus.AwaitingPayment)
            throw new AppException(StatusCodes.Status400BadRequest, "Це замовлення вже не очікує оплату.");

        if (payments.LiqPayConfigured)
        {
            var (data, signature) = payments.CreateCheckout(order);
            return new PaymentStartResponse(
                "liqpay",
                "Далі відкриється сторінка LiqPay. Номер картки вводиться лише там.",
                data,
                signature,
                null);
        }

        var claimed = await db.Orders
            .Where(item => item.Id == orderId && item.Status == OrderStatus.AwaitingPayment)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, OrderStatus.Processing), cancellationToken);
        if (claimed == 0)
            throw new AppException(StatusCodes.Status400BadRequest, "Статус замовлення вже змінився.");

        order.Status = OrderStatus.Processing;
        await notifier.NotifyStatusAsync(order, cancellationToken);
        return new PaymentStartResponse(
            "demo",
            "Це демо-оплата: гроші не списуються. Замовлення передано в обробку.",
            null,
            null,
            Map(order));
    }

    public async Task ConfirmLiqPayAsync(string? data, string? signature, CancellationToken cancellationToken)
    {
        if (!payments.SignatureMatches(data, signature))
            throw new AppException(StatusCodes.Status400BadRequest, "Підпис LiqPay не збігається.");

        var status = payments.StatusFromData(data!);
        if (status is not ("success" or "sandbox" or "wait_accept"))
            return;

        var orderId = payments.OrderIdFromData(data!)
            ?? throw new AppException(StatusCodes.Status400BadRequest, "У відповіді LiqPay немає номера замовлення.");
        var claimed = await db.Orders
            .Where(item => item.Id == orderId && item.Status == OrderStatus.AwaitingPayment)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, OrderStatus.Processing), cancellationToken);
        if (claimed == 0)
            return;

        var order = await db.Orders.Include(item => item.User).Include(item => item.Items)
            .SingleAsync(item => item.Id == orderId, cancellationToken);
        await notifier.NotifyStatusAsync(order, cancellationToken);
    }

    private async Task RestoreStockAsync(int orderId, CancellationToken cancellationToken)
    {
        var items = await db.OrderItems.Where(item => item.OrderId == orderId).ToListAsync(cancellationToken);
        var productIds = items.Select(item => item.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);
        foreach (var item in items)
        {
            if (products.TryGetValue(item.ProductId, out var product))
                product.Stock += item.Quantity;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<CustomerOrder> Query(int userId) =>
        db.Orders.Include(order => order.Items).Where(order => order.UserId == userId).OrderByDescending(order => order.CreatedAt);

    private static OrderResponse Map(CustomerOrder order) => new(
        order.Id,
        order.CreatedAt,
        order.Status,
        order.RecipientName,
        order.Phone,
        order.City,
        order.DeliveryMethod,
        order.DeliveryAddress,
        order.PaymentMethod,
        order.Comment,
        order.Total,
        order.Items
            .OrderBy(item => item.Id)
            .Select(item => new OrderItemResponse(
                item.ProductId,
                item.ProductName,
                item.UnitPrice,
                item.Quantity,
                item.UnitPrice * item.Quantity))
            .ToList());
}
