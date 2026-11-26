using RozetkaAPI.Entities;

namespace RozetkaAPI.Contracts;

public record ProductListItemResponse(
    int Id,
    string Name,
    string ShortDescription,
    decimal Price,
    decimal? OldPrice,
    int Stock,
    double? AverageRating,
    int ReviewCount,
    int CategoryId,
    string CategoryName,
    string? ImageUrl);

public record CharacteristicResponse(string Name, string Value);

public record CategoryResponse(int Id, string Name);

public record SaveCategoryRequest(string Name);

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
    decimal? OldPrice,
    int Stock,
    double? AverageRating,
    int ReviewCount,
    bool IsFavorite,
    int CartQuantity,
    ReviewResponse? MyReview,
    IReadOnlyList<ReviewResponse> Reviews,
    string FullDescription,
    string? ManufacturerUrl,
    int CategoryId,
    string CategoryName,
    IReadOnlyList<string> Images,
    IReadOnlyList<CharacteristicResponse> Characteristics,
    bool CanReview);

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

public record AddCartRequest(int ProductId);

public record FavoriteResponse(
    int ProductId,
    string Name,
    string ShortDescription,
    decimal Price,
    int Stock,
    string? ImageUrl);

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

public record CharacteristicInput(string Name, string Value);

public record SaveProductRequest(
    string Name,
    string ShortDescription,
    string? FullDescription,
    decimal Price,
    int Stock,
    int CategoryId,
    string? ManufacturerUrl,
    IReadOnlyList<string>? ImageUrls,
    IReadOnlyList<CharacteristicInput>? Characteristics);

public record AdminProductResponse(
    int Id,
    string Name,
    string ShortDescription,
    string FullDescription,
    decimal Price,
    int Stock,
    int CategoryId,
    string? ManufacturerUrl,
    IReadOnlyList<string> ImageUrls,
    IReadOnlyList<CharacteristicInput> Characteristics);

public record UploadedFileResponse(string Url);

public record CityResponse(string Ref, string Name);

public record WarehouseResponse(string Ref, string Name);

public record PaymentStartResponse(string Mode, string Message, string? Data, string? Signature, OrderResponse? Order);

public record SetOrderStatusRequest(OrderStatus Status);

public record AdminOrderResponse(
    int Id,
    DateTime CreatedAt,
    OrderStatus Status,
    string UserEmail,
    string RecipientName,
    string Phone,
    string City,
    string DeliveryMethod,
    string DeliveryAddress,
    string PaymentMethod,
    string? Comment,
    decimal Total,
    IReadOnlyList<OrderItemResponse> Items);

public record AdminUserResponse(
    int Id,
    string Email,
    string FirstName,
    string LastName,
    string? Phone,
    string Role,
    bool IsBlocked,
    DateTime CreatedAt);

public record SetUserBlockedRequest(bool IsBlocked);

public record SetUserRoleRequest(string Role);

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
