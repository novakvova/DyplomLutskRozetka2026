using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class CatalogService(AppDbContext db)
{
    public async Task<IReadOnlyList<CategoryResponse>> CategoriesAsync(CancellationToken cancellationToken)
    {
        return await db.Categories
            .OrderBy(category => category.Name)
            .Select(category => new CategoryResponse(category.Id, category.Name))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProductListItemResponse>> ListAsync(
        string? query,
        string? sort,
        int? categoryId,
        decimal? minPrice,
        decimal? maxPrice,
        string? ids,
        CancellationToken cancellationToken)
    {
        var products = db.Products.AsQueryable();
        var wanted = ParseIds(ids);
        if (wanted.Count > 0)
            products = products.Where(product => wanted.Contains(product.Id));
        if (categoryId is > 0)
            products = products.Where(product => product.CategoryId == categoryId);
        if (minPrice is not null)
            products = products.Where(product => product.Price >= minPrice);
        if (maxPrice is not null)
            products = products.Where(product => product.Price <= maxPrice);
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
                db.Reviews.Count(review => review.ProductId == product.Id),
                product.CategoryId,
                product.Category.Name,
                product.ImageUrl))
            .ToListAsync(cancellationToken);
    }

    private static List<int> ParseIds(string? ids)
    {
        if (string.IsNullOrWhiteSpace(ids))
            return [];
        return ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => int.TryParse(value, out var id) ? id : 0)
            .Where(id => id > 0)
            .Distinct()
            .Take(12)
            .ToList();
    }

    public async Task<ProductDetailsResponse> GetAsync(int productId, int? userId, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(item => item.Category)
            .Include(item => item.Images)
            .Include(item => item.Characteristics)
            .SingleOrDefaultAsync(item => item.Id == productId, cancellationToken)
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
        var canReview = userId is not null && await db.OrderItems.AnyAsync(
            item => item.ProductId == productId && item.Order.UserId == userId && item.Order.Status != OrderStatus.Cancelled,
            cancellationToken);
        var images = product.Images
            .OrderBy(image => image.SortOrder)
            .Select(image => image.Url)
            .ToList();
        if (images.Count == 0 && !string.IsNullOrWhiteSpace(product.ImageUrl))
            images.Add(product.ImageUrl);

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
            reviews,
            product.FullDescription,
            product.ManufacturerUrl,
            product.CategoryId,
            product.Category.Name,
            images,
            product.Characteristics
                .OrderBy(item => item.SortOrder)
                .Select(item => new CharacteristicResponse(item.Name, item.Value))
                .ToList(),
            canReview);
    }
}
