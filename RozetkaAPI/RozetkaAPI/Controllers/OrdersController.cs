using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController(OrderService orders) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<OrderResponse>> List(CancellationToken cancellationToken) =>
        await orders.ListAsync(CurrentUser.Id(User), cancellationToken);

    [HttpGet("{id:int}")]
    public async Task<OrderResponse> Get(int id, CancellationToken cancellationToken) =>
        await orders.GetAsync(CurrentUser.Id(User), id, cancellationToken);

    [HttpPost]
    public async Task<OrderResponse> Checkout(CheckoutRequest request, CancellationToken cancellationToken) =>
        await orders.CheckoutAsync(CurrentUser.Id(User), request, cancellationToken);
}
