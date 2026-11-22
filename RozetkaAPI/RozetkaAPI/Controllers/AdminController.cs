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
