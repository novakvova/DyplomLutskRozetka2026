using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/delivery")]
public class DeliveryController(DeliveryService delivery) : ControllerBase
{
    [HttpGet("cities")]
    public async Task<IReadOnlyList<CityResponse>> Cities([FromQuery] string? query, CancellationToken cancellationToken) =>
        await delivery.CitiesAsync(query, cancellationToken);

    [HttpGet("warehouses")]
    public async Task<IReadOnlyList<WarehouseResponse>> Warehouses([FromQuery] string? cityRef, CancellationToken cancellationToken) =>
        await delivery.WarehousesAsync(cityRef, cancellationToken);
}
