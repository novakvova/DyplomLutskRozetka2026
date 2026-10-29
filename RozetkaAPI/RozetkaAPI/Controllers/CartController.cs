using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/cart")]
public class CartController(CartService cart) : ControllerBase
{
    [HttpGet]
    public async Task<CartResponse> Get(CancellationToken cancellationToken) =>
        await cart.GetAsync(CurrentUser.Id(User), cancellationToken);

    [HttpPut]
    public async Task<CartResponse> Set(ChangeCartRequest request, CancellationToken cancellationToken) =>
        await cart.SetQuantityAsync(CurrentUser.Id(User), request, cancellationToken);

    [HttpDelete("{productId:int}")]
    public async Task<CartResponse> Remove(int productId, CancellationToken cancellationToken) =>
        await cart.SetQuantityAsync(CurrentUser.Id(User), new ChangeCartRequest(productId, 0), cancellationToken);
}
