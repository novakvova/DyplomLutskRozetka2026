using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class AdminService(AppDbContext db, OrderNotifier notifier)
{
    public async Task<ProductListItemResponse> CreateProductAsync(int userId, SaveProductRequest request, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = new Product { CreatedAt = DateTime.UtcNow };
        await ApplyProductAsync(product, request, cancellationToken);
        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken);
        return await MapProductAsync(product.Id, cancellationToken);
    }

    public async Task<ProductListItemResponse> UpdateProductAsync(int userId, int productId, SaveProductRequest request, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = await db.Products.SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");
        await ApplyProductAsync(product, request, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await MapProductAsync(product.Id, cancellationToken);
    }

    public async Task DeleteProductAsync(int userId, int productId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = await db.Products.SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");
        var inOpenOrder = await db.OrderItems.AnyAsync(
            item => item.ProductId == productId && item.Order.Status != OrderStatus.Cancelled,
            cancellationToken);
        if (inOpenOrder)
            throw new AppException(StatusCodes.Status409Conflict, "Товар є в незавершеному замовленні. Спочатку завершіть або скасуйте його.");

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
        {
            var claimed = await db.Orders
                .Where(item => item.Id == orderId && item.Status == order.Status)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, OrderStatus.Cancelled), cancellationToken);
            if (claimed == 0)
                throw new AppException(StatusCodes.Status400BadRequest, "Статус замовлення вже змінився. Оновіть список.");

            order.Status = OrderStatus.Cancelled;
            await RestoreStockAsync(order, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            await notifier.NotifyStatusAsync(order, cancellationToken);
            return MapOrder(order);
        }

        order.Status = status;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await notifier.NotifyStatusAsync(order, cancellationToken);
        return MapOrder(order);
    }

    public async Task<IReadOnlyList<CategoryResponse>> ListCategoriesAsync(int userId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        return await db.Categories
            .OrderBy(category => category.Name)
            .Select(category => new CategoryResponse(category.Id, category.Name))
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryResponse> CreateCategoryAsync(int userId, string name, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var category = new Category { Name = CategoryName(name) };
        if (await db.Categories.AnyAsync(item => item.Name == category.Name, cancellationToken))
            throw new AppException(StatusCodes.Status409Conflict, "Така категорія вже є.");
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);
        return new CategoryResponse(category.Id, category.Name);
    }

    public async Task<CategoryResponse> UpdateCategoryAsync(int userId, int categoryId, string name, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var category = await db.Categories.SingleOrDefaultAsync(item => item.Id == categoryId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Категорію не знайдено.");
        category.Name = CategoryName(name);
        if (await db.Categories.AnyAsync(item => item.Id != categoryId && item.Name == category.Name, cancellationToken))
            throw new AppException(StatusCodes.Status409Conflict, "Така категорія вже є.");
        await db.SaveChangesAsync(cancellationToken);
        return new CategoryResponse(category.Id, category.Name);
    }

    public async Task DeleteCategoryAsync(int userId, int categoryId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var category = await db.Categories.SingleOrDefaultAsync(item => item.Id == categoryId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Категорію не знайдено.");
        if (await db.Products.AnyAsync(product => product.CategoryId == categoryId, cancellationToken))
            throw new AppException(StatusCodes.Status409Conflict, "У категорії ще є товари. Спочатку перенесіть або видаліть їх.");
        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<AdminProductResponse> GetProductAsync(int userId, int productId, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        var product = await db.Products
            .Include(item => item.Images)
            .Include(item => item.Characteristics)
            .SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");
        return MapAdminProduct(product);
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
        return MapUser(user);
    }

    public async Task<AdminUserResponse> SetUserRoleAsync(int userId, int targetId, string roleName, CancellationToken cancellationToken)
    {
        await EnsureAdminAsync(userId, cancellationToken);
        if (userId == targetId)
            throw new AppException(StatusCodes.Status400BadRequest, "Не можна змінити власну роль.");
        if (!Enum.TryParse<UserRole>(roleName, ignoreCase: false, out var role) || !Enum.IsDefined(role))
            throw new AppException(StatusCodes.Status400BadRequest, "Невідома роль.");

        var user = await db.Users.SingleOrDefaultAsync(item => item.Id == targetId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Користувача не знайдено.");
        if (user.Role == UserRole.Admin && role == UserRole.Buyer)
        {
            var otherAdmins = await db.Users.CountAsync(item => item.Role == UserRole.Admin && item.Id != user.Id, cancellationToken);
            if (otherAdmins == 0)
                throw new AppException(StatusCodes.Status400BadRequest, "Має лишитися хоча б один адміністратор.");
        }

        user.Role = role;
        await db.SaveChangesAsync(cancellationToken);
        return MapUser(user);
    }

    private static AdminUserResponse MapUser(User user) => new(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Phone,
            user.Role.ToString(),
            user.IsBlocked,
            user.CreatedAt);

    private async Task EnsureAdminAsync(int userId, CancellationToken cancellationToken)
    {
        var role = await db.Users
            .Where(user => user.Id == userId)
            .Select(user => (UserRole?)user.Role)
            .FirstOrDefaultAsync(cancellationToken);
        if (role != UserRole.Admin)
            throw new AppException(StatusCodes.Status403Forbidden, "Ця дія доступна лише адміністратору.");
    }

    private async Task ApplyProductAsync(Product product, SaveProductRequest request, CancellationToken cancellationToken)
    {
        product.Name = InputRules.RequiredText(request.Name, "Назва", 160);
        product.ShortDescription = InputRules.RequiredText(request.ShortDescription, "Короткий опис", 1000);
        product.FullDescription = InputRules.OptionalText(request.FullDescription, "Повний опис", 4000);
        if (request.Price <= 0 || request.Price > 10_000_000)
            throw new AppException(StatusCodes.Status400BadRequest, "Ціна має бути більшою за 0.");
        if (request.Stock < 0 || request.Stock > 1_000_000)
            throw new AppException(StatusCodes.Status400BadRequest, "Кількість на складі не може бути від’ємною.");
        if (!await db.Categories.AnyAsync(category => category.Id == request.CategoryId, cancellationToken))
            throw new AppException(StatusCodes.Status400BadRequest, "Оберіть категорію.");

        product.Price = request.Price;
        product.Stock = request.Stock;
        product.CategoryId = request.CategoryId;
        product.ManufacturerUrl = InputRules.WebAddress(request.ManufacturerUrl);

        var images = (request.ImageUrls ?? [])
            .Select(url => url?.Trim() ?? "")
            .Where(url => url.Length > 0)
            .Distinct()
            .Take(8)
            .ToList();
        if (images.Any(url => url.Length > 300 || !(url.StartsWith('/') || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))))
            throw new AppException(StatusCodes.Status400BadRequest, "Фото має бути посиланням http(s) або файлом магазину.");

        var specs = (request.Characteristics ?? [])
            .Select(item => new CharacteristicInput(
                InputRules.OptionalText(item.Name, "Назва характеристики", 80),
                InputRules.OptionalText(item.Value, "Значення характеристики", 200)))
            .Where(item => item.Name.Length > 0 && item.Value.Length > 0)
            .Take(20)
            .ToList();

        if (product.Id != 0)
        {
            var oldImages = await db.ProductImages.Where(image => image.ProductId == product.Id).ToListAsync(cancellationToken);
            var oldSpecs = await db.ProductCharacteristics.Where(item => item.ProductId == product.Id).ToListAsync(cancellationToken);
            db.ProductImages.RemoveRange(oldImages);
            db.ProductCharacteristics.RemoveRange(oldSpecs);
        }

        product.ImageUrl = images.FirstOrDefault();
        product.Images = images.Select((url, index) => new ProductImage { Url = url, SortOrder = index }).ToList();
        product.Characteristics = specs.Select((item, index) => new ProductCharacteristic
        {
            Name = item.Name,
            Value = item.Value,
            SortOrder = index
        }).ToList();
    }

    private static string CategoryName(string? name) => InputRules.RequiredText(name, "Назва категорії", 80);

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

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<ProductListItemResponse> MapProductAsync(int productId, CancellationToken cancellationToken)
    {
        return await db.Products
            .Where(product => product.Id == productId)
            .Select(product => new ProductListItemResponse(
                product.Id,
                product.Name,
                product.ShortDescription,
                product.Price,
                product.OldPrice,
                product.Stock,
                null,
                0,
                product.CategoryId,
                product.Category.Name,
                product.ImageUrl))
            .SingleAsync(cancellationToken);
    }

    private static AdminProductResponse MapAdminProduct(Product product)
    {
        var images = product.Images.OrderBy(image => image.SortOrder).Select(image => image.Url).ToList();
        if (images.Count == 0 && !string.IsNullOrWhiteSpace(product.ImageUrl))
            images.Add(product.ImageUrl);
        return new AdminProductResponse(
            product.Id,
            product.Name,
            product.ShortDescription,
            product.FullDescription,
            product.Price,
            product.Stock,
            product.CategoryId,
            product.ManufacturerUrl,
            images,
            product.Characteristics
                .OrderBy(item => item.SortOrder)
                .Select(item => new CharacteristicInput(item.Name, item.Value))
                .ToList());
    }

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
