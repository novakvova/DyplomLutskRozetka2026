using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class OrderService(AppDbContext db)
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
