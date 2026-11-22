using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(OrderService orders) : ControllerBase
{
    [HttpPost("liqpay")]
    public async Task<IActionResult> LiqPay([FromForm] string? data, [FromForm] string? signature, CancellationToken cancellationToken)
    {
        await orders.ConfirmLiqPayAsync(data, signature, cancellationToken);
        return Ok(new { message = "Прийнято." });
    }
}
