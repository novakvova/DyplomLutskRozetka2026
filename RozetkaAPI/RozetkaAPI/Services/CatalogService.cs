using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class CatalogService(AppDbContext db)
{
    public async Task<IReadOnlyList<ProductListItemResponse>> ListAsync(string? query, string? sort, CancellationToken cancellationToken)
    {
        var products = db.Products.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var raw = query.Trim();
            var term = raw.ToLower();
            products = products.Where(product =>
                product.Name.ToLower().Contains(term) || product.ShortDescription.ToLower().Contains(term)
                || product.Name.Contains(raw) || product.ShortDescription.Contains(raw));
        }

        products = sort switch
        {
            "price_asc" => products.OrderBy(product => product.Price).ThenBy(product => product.Id),
            "price_desc" => products.OrderByDescending(product => product.Price).ThenBy(product => product.Id),
            "name" => products.OrderBy(product => product.Name).ThenBy(product => product.Id),
            _ => products.OrderBy(product => product.Id)
        };

        return await products
            .Select(product => new ProductListItemResponse(
                product.Id,
                product.Name,
                product.ShortDescription,
                product.Price,
                product.Stock,
                db.Reviews.Where(review => review.ProductId == product.Id).Average(review => (double?)review.Rating),
                db.Reviews.Count(review => review.ProductId == product.Id)))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDetailsResponse> GetAsync(int productId, int? userId, CancellationToken cancellationToken)
    {
        var product = await db.Products.SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");

        var reviews = await db.Reviews
            .Where(review => review.ProductId == productId)
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new ReviewResponse(
                review.Id,
                review.Rating,
                review.Text,
                review.User.FirstName + " " + review.User.LastName,
                review.CreatedAt,
                userId != null && review.UserId == userId))
            .ToListAsync(cancellationToken);

        var isFavorite = userId is not null && await db.Favorites.AnyAsync(
            favorite => favorite.UserId == userId && favorite.ProductId == productId, cancellationToken);
        var cartQuantity = userId is null
            ? 0
            : await db.CartItems
                .Where(item => item.UserId == userId && item.ProductId == productId)
                .Select(item => item.Quantity)
                .FirstOrDefaultAsync(cancellationToken);

        return new ProductDetailsResponse(
            product.Id,
            product.Name,
            product.ShortDescription,
            product.Price,
            product.Stock,
            reviews.Count == 0 ? null : reviews.Average(review => review.Rating),
            reviews.Count,
            isFavorite,
            cartQuantity,
            reviews.FirstOrDefault(review => review.IsMine),
            reviews);
    }
}
