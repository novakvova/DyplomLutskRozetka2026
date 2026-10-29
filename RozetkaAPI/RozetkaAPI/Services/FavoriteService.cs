using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class FavoriteService(AppDbContext db)
{
    public async Task<IReadOnlyList<FavoriteResponse>> ListAsync(int userId, CancellationToken cancellationToken)
    {
        return await db.Favorites
            .Where(favorite => favorite.UserId == userId)
            .OrderByDescending(favorite => favorite.CreatedAt)
            .Select(favorite => new FavoriteResponse(
                favorite.ProductId,
                favorite.Product.Name,
                favorite.Product.ShortDescription,
                favorite.Product.Price,
                favorite.Product.Stock))
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(int userId, int productId, CancellationToken cancellationToken)
    {
        if (!await db.Products.AnyAsync(product => product.Id == productId, cancellationToken))
            throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");

        var exists = await db.Favorites.AnyAsync(
            favorite => favorite.UserId == userId && favorite.ProductId == productId, cancellationToken);
        if (exists)
            return;

        db.Favorites.Add(new Favorite
        {
            UserId = userId,
            ProductId = productId,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(int userId, int productId, CancellationToken cancellationToken)
    {
        var favorite = await db.Favorites.SingleOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == productId, cancellationToken);
        if (favorite is null)
            return;

        db.Favorites.Remove(favorite);
        await db.SaveChangesAsync(cancellationToken);
    }
}
