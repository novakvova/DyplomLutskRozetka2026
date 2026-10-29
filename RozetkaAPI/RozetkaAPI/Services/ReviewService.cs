using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class ReviewService(AppDbContext db)
{
    public async Task<ReviewResponse> CreateAsync(int userId, int productId, UpsertReviewRequest request, CancellationToken cancellationToken)
    {
        if (!await db.Products.AnyAsync(product => product.Id == productId, cancellationToken))
            throw new AppException(StatusCodes.Status404NotFound, "Товар не знайдено.");

        if (await db.Reviews.AnyAsync(review => review.UserId == userId && review.ProductId == productId, cancellationToken))
            throw new AppException(StatusCodes.Status409Conflict, "Ви вже залишили відгук про цей товар.");

        var review = new Review
        {
            UserId = userId,
            ProductId = productId,
            Rating = Rating(request.Rating),
            Text = Text(request.Text),
            CreatedAt = DateTime.UtcNow
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync(cancellationToken);
        await db.Entry(review).Reference(item => item.User).LoadAsync(cancellationToken);
        return Map(review, userId);
    }

    public async Task<ReviewResponse> UpdateAsync(int userId, int reviewId, UpsertReviewRequest request, CancellationToken cancellationToken)
    {
        var review = await db.Reviews.Include(item => item.User)
            .SingleOrDefaultAsync(item => item.Id == reviewId && item.UserId == userId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status404NotFound, "Відгук не знайдено.");

        review.Rating = Rating(request.Rating);
        review.Text = Text(request.Text);
        await db.SaveChangesAsync(cancellationToken);
        return Map(review, userId);
    }

    private static int Rating(int rating)
    {
        if (rating is < 1 or > 5)
            throw new AppException(StatusCodes.Status400BadRequest, "Оцінка має бути від 1 до 5.");
        return rating;
    }

    private static string Text(string? text)
    {
        var value = text?.Trim() ?? "";
        if (value.Length is < 10 or > 1000)
            throw new AppException(StatusCodes.Status400BadRequest, "Текст відгуку має містити від 10 до 1000 символів.");
        return value;
    }

    private static ReviewResponse Map(Review review, int userId) => new(
        review.Id,
        review.Rating,
        review.Text,
        $"{review.User.FirstName} {review.User.LastName}",
        review.CreatedAt,
        review.UserId == userId);
}
