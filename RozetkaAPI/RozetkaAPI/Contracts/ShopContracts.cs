using RozetkaAPI.Entities;

namespace RozetkaAPI.Contracts;

public record ProductListItemResponse(
    int Id,
    string Name,
    string ShortDescription,
    decimal Price,
    int Stock,
    double? AverageRating,
    int ReviewCount);

public record ReviewResponse(
    int Id,
    int Rating,
    string Text,
    string AuthorName,
    DateTime CreatedAt,
    bool IsMine);

public record ProductDetailsResponse(
    int Id,
    string Name,
    string ShortDescription,
    decimal Price,
    int Stock,
    double? AverageRating,
    int ReviewCount,
    bool IsFavorite,
    int CartQuantity,
    ReviewResponse? MyReview,
    IReadOnlyList<ReviewResponse> Reviews);

public record UpsertReviewRequest(int Rating, string Text);

public record CartLineResponse(
    int ProductId,
    string Name,
    decimal UnitPrice,
    int Quantity,
    int Stock,
    decimal LineTotal);

public record CartResponse(IReadOnlyList<CartLineResponse> Items, decimal Total);

public record ChangeCartRequest(int ProductId, int Quantity);

public record FavoriteResponse(
    int ProductId,
    string Name,
    string ShortDescription,
    decimal Price,
    int Stock);

public record FavoriteRequest(int ProductId);

public record CheckoutRequest(
    string RecipientName,
    string Phone,
    string City,
    string DeliveryMethod,
    string DeliveryAddress,
    string PaymentMethod,
    string? Comment);

public record OrderItemResponse(int ProductId, string ProductName, decimal UnitPrice, int Quantity, decimal LineTotal);

public record OrderResponse(
    int Id,
    DateTime CreatedAt,
    OrderStatus Status,
    string RecipientName,
    string Phone,
    string City,
    string DeliveryMethod,
    string DeliveryAddress,
    string PaymentMethod,
    string? Comment,
    decimal Total,
    IReadOnlyList<OrderItemResponse> Items);
