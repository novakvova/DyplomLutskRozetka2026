using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Entities;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(CatalogService catalog, ReviewService reviews) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<ProductListItemResponse>> List(CancellationToken cancellationToken) =>
        await catalog.ListAsync(cancellationToken);

    [HttpGet("{id:int}")]
    public async Task<ProductDetailsResponse> Get(int id, CancellationToken cancellationToken) =>
        await catalog.GetAsync(id, UserIdOrNull(), cancellationToken);

    // POST: api/products (Створення товару — для адмінки)
    [HttpPost]
    public async Task<IActionResult> Create(Product request, CancellationToken cancellationToken)
    {
        var productId = await catalog.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = productId }, null);
    }

    // PUT: api/products/5 (Редагування товару — для адмінки)
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Product request, CancellationToken cancellationToken)
    {
        await catalog.UpdateAsync(id, request, cancellationToken);
        return NoContent();
    }

    // DELETE: api/products/5 (Видалення товару — для адмінки)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await catalog.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:int}/reviews")]
    public async Task<ReviewResponse> CreateReview(int id, UpsertReviewRequest request, CancellationToken cancellationToken) =>
        await reviews.CreateAsync(CurrentUser.Id(User), id, request, cancellationToken);

    private int? UserIdOrNull() =>
        User.Identity?.IsAuthenticated == true ? CurrentUser.Id(User) : null;
}