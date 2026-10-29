using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class CartService(AppDbContext db)
{
    public const int MaxQuantity = 20;

    public async Task<CartResponse> GetAsync(int userId, CancellationToken cancellationToken)
    {
        var items = await Lines(userId).ToListAsync(cancellationToken);
        return new CartResponse(items, items.Sum(item => item.LineTotal));
    }

    public async Task<CartResponse> SetQuantityAsync(int userId, ChangeCartRequest request, CancellationToken cancellationToken)
    {
        if (request.Quantity < 0 || request.Quantity > MaxQuantity)
            throw new AppException(StatusCodes.Status400BadRequest, $"Кількість має бути від 1 до {MaxQuantity}.");

        var product = await db.Products.SingleOrDefaultAsync(item => item.Id == request.ProductId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");
        var existing = await db.CartItems.SingleOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == request.ProductId, cancellationToken);

        if (request.Quantity == 0)
        {
            if (existing is not null)
                db.CartItems.Remove(existing);
        }
        else
        {
            if (product.Stock < request.Quantity)
                throw new AppException(StatusCodes.Status400BadRequest, "На складі немає такої кількості.");

            if (existing is null)
            {
                db.CartItems.Add(new CartItem
                {
                    UserId = userId,
                    ProductId = product.Id,
                    Quantity = request.Quantity
                });
            }
            else
            {
                existing.Quantity = request.Quantity;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return await GetAsync(userId, cancellationToken);
    }

    private IQueryable<CartLineResponse> Lines(int userId) =>
        db.CartItems
            .Where(item => item.UserId == userId)
            .OrderBy(item => item.Id)
            .Select(item => new CartLineResponse(
                item.ProductId,
                item.Product.Name,
                item.Product.Price,
                item.Quantity,
                item.Product.Stock,
                item.Product.Price * item.Quantity));
}
