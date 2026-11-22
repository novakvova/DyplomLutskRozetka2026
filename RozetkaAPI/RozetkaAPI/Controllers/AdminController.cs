using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public class AdminController(AdminService admin) : ControllerBase
{
    [HttpGet("products/{id:int}")]
    public async Task<AdminProductResponse> GetProduct(int id, CancellationToken cancellationToken) =>
        await admin.GetProductAsync(CurrentUser.Id(User), id, cancellationToken);

    [HttpPost("products")]
    public async Task<ProductListItemResponse> CreateProduct(SaveProductRequest request, CancellationToken cancellationToken) =>
        await admin.CreateProductAsync(CurrentUser.Id(User), request, cancellationToken);

    [HttpPut("products/{id:int}")]
    public async Task<ProductListItemResponse> UpdateProduct(int id, SaveProductRequest request, CancellationToken cancellationToken) =>
        await admin.UpdateProductAsync(CurrentUser.Id(User), id, request, cancellationToken);

    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken cancellationToken)
    {
        await admin.DeleteProductAsync(CurrentUser.Id(User), id, cancellationToken);
        return NoContent();
    }

    [HttpPost("uploads")]
    [RequestSizeLimit(2_000_000)]
    public async Task<UploadedFileResponse> Upload(IFormFile? file, CancellationToken cancellationToken)
    {
        await admin.ListCategoriesAsync(CurrentUser.Id(User), cancellationToken);
        if (file is null || file.Length == 0)
            throw new RozetkaAPI.Common.AppException(StatusCodes.Status400BadRequest, "Оберіть файл зображення.");
        var extension = file.ContentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => throw new RozetkaAPI.Common.AppException(StatusCodes.Status400BadRequest, "Можна завантажити лише JPG, PNG, WEBP або GIF.")
        };
        var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(folder);
        var name = $"{Guid.NewGuid():N}{extension}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, name)))
            await file.CopyToAsync(stream, cancellationToken);
        return new UploadedFileResponse($"/uploads/{name}");
    }

    [HttpGet("categories")]
    public async Task<IReadOnlyList<CategoryResponse>> ListCategories(CancellationToken cancellationToken) =>
        await admin.ListCategoriesAsync(CurrentUser.Id(User), cancellationToken);

    [HttpPost("categories")]
    public async Task<CategoryResponse> CreateCategory(SaveCategoryRequest request, CancellationToken cancellationToken) =>
        await admin.CreateCategoryAsync(CurrentUser.Id(User), request.Name, cancellationToken);

    [HttpPut("categories/{id:int}")]
    public async Task<CategoryResponse> UpdateCategory(int id, SaveCategoryRequest request, CancellationToken cancellationToken) =>
        await admin.UpdateCategoryAsync(CurrentUser.Id(User), id, request.Name, cancellationToken);

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken cancellationToken)
    {
        await admin.DeleteCategoryAsync(CurrentUser.Id(User), id, cancellationToken);
        return NoContent();
    }

    [HttpGet("orders")]
    public async Task<IReadOnlyList<AdminOrderResponse>> ListOrders(CancellationToken cancellationToken) =>
        await admin.ListOrdersAsync(CurrentUser.Id(User), cancellationToken);

    [HttpPut("orders/{id:int}/status")]
    public async Task<AdminOrderResponse> SetOrderStatus(int id, SetOrderStatusRequest request, CancellationToken cancellationToken) =>
        await admin.SetOrderStatusAsync(CurrentUser.Id(User), id, request.Status, cancellationToken);

    [HttpGet("users")]
    public async Task<IReadOnlyList<AdminUserResponse>> ListUsers(CancellationToken cancellationToken) =>
        await admin.ListUsersAsync(CurrentUser.Id(User), cancellationToken);

    [HttpPut("users/{id:int}/blocked")]
    public async Task<AdminUserResponse> SetUserBlocked(int id, SetUserBlockedRequest request, CancellationToken cancellationToken) =>
        await admin.SetUserBlockedAsync(CurrentUser.Id(User), id, request.IsBlocked, cancellationToken);

    [HttpPut("users/{id:int}/role")]
    public async Task<AdminUserResponse> SetUserRole(int id, SetUserRoleRequest request, CancellationToken cancellationToken) =>
        await admin.SetUserRoleAsync(CurrentUser.Id(User), id, request.Role, cancellationToken);
}
