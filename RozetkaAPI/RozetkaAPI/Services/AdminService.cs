using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class AdminService(AppDbContext db)
{
    public async Task<ProductListItemResponse> CreateProductAsync(int userId, SaveProductRequest request, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = new Product { CreatedAt = DateTime.UtcNow };
        ApplyProduct(product, request);
        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken);
        return MapProduct(product);
    }

    public async Task<ProductListItemResponse> UpdateProductAsync(int userId, int productId, SaveProductRequest request, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = await db.Products.SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");
        ApplyProduct(product, request);
        await db.SaveChangesAsync(cancellationToken);
        return MapProduct(product);
    }

    public async Task DeleteProductAsync(int userId, int productId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = await db.Products.SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");
        db.Products.Remove(product);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminOrderResponse>> ListOrdersAsync(int userId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var orders = await db.Orders
            .Include(order => order.User)
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAt)
            .ToListAsync(cancellationToken);
        return orders.Select(MapOrder).ToList();
    }

    public async Task<AdminOrderResponse> SetOrderStatusAsync(int userId, int orderId, OrderStatus status, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        if (!Enum.IsDefined(status))
            throw new AppException(StatusCodes.Status400BadRequest, "Невідомий статус замовлення.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var order = await db.Orders
            .Include(item => item.User)
            .Include(item => item.Items)
            .SingleOrDefaultAsync(item => item.Id == orderId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Замовлення не знайдено.");

        if (order.Status == status)
            return MapOrder(order);

        if (order.Status == OrderStatus.Cancelled)
            throw new AppException(StatusCodes.Status400BadRequest, "Скасоване замовлення не можна повернути в роботу.");

        if (status == OrderStatus.Cancelled)
            await RestoreStockAsync(order, cancellationToken);

        order.Status = status;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return MapOrder(order);
    }

    public async Task<IReadOnlyList<AdminUserResponse>> ListUsersAsync(int userId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        return await db.Users
            .OrderBy(user => user.Id)
            .Select(user => new AdminUserResponse(
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Phone,
                user.Role.ToString(),
                user.IsBlocked,
                user.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<AdminUserResponse> SetUserBlockedAsync(int userId, int targetId, bool isBlocked, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        if (userId == targetId)
            throw new AppException(StatusCodes.Status400BadRequest, "Не можна заблокувати власний обліковий запис.");

        var user = await db.Users.SingleOrDefaultAsync(item => item.Id == targetId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Користувача не знайдено.");
        if (user.Role == UserRole.Admin && isBlocked)
            throw new AppException(StatusCodes.Status400BadRequest, "Не можна заблокувати адміністратора.");

        user.IsBlocked = isBlocked;
        await db.SaveChangesAsync(cancellationToken);
        return new AdminUserResponse(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Phone,
            user.Role.ToString(),
            user.IsBlocked,
            user.CreatedAt);
    }

    private async Task EnsureAdminAsync(int userId, CancellationToken cancellationToken)
    {
        var role = await db.Users
            .Where(user => user.Id == userId)
            .Select(user => (UserRole?)user.Role)
            .FirstOrDefaultAsync(cancellationToken);
        if (role != UserRole.Admin)
            throw new AppException(StatusCodes.Status403Forbidden, "Ця дія доступна лише адміністратору.");
    }

    private static void ApplyProduct(Product product, SaveProductRequest request)
    {
        product.Name = InputRules.RequiredText(request.Name, "Назва", 160);
        product.ShortDescription = InputRules.RequiredText(request.ShortDescription, "Короткий опис", 1000);
        if (request.Price <= 0 || request.Price > 10_000_000)
            throw new AppException(StatusCodes.Status400BadRequest, "Ціна має бути більшою за 0.");
        if (request.Stock < 0 || request.Stock > 1_000_000)
            throw new AppException(StatusCodes.Status400BadRequest, "Кількість на складі не може бути від’ємною.");
        product.Price = request.Price;
        product.Stock = request.Stock;
    }

    private async Task RestoreStockAsync(CustomerOrder order, CancellationToken cancellationToken)
    {
        var productIds = order.Items.Select(item => item.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);
        foreach (var item in order.Items)
        {
            if (products.TryGetValue(item.ProductId, out var product))
                product.Stock += item.Quantity;
        }
    }

    private static ProductListItemResponse MapProduct(Product product) => new(
        product.Id,
        product.Name,
        product.ShortDescription,
        product.Price,
        product.Stock,
        null,
        0);

    private static AdminOrderResponse MapOrder(CustomerOrder order) => new(
        order.Id,
        order.CreatedAt,
        order.Status,
        order.User.Email,
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
