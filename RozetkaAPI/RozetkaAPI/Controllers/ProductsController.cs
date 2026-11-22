using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(CatalogService catalog, ReviewService reviews) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<ProductListItemResponse>> List(
        [FromQuery] string? query,
        [FromQuery] string? sort,
        [FromQuery] int? categoryId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? ids,
        CancellationToken cancellationToken) =>
        await catalog.ListAsync(query, sort, categoryId, minPrice, maxPrice, ids, cancellationToken);

    [HttpGet("{id:int}")]
    public async Task<ProductDetailsResponse> Get(int id, CancellationToken cancellationToken) =>
        await catalog.GetAsync(id, UserIdOrNull(), cancellationToken);

    [Authorize]
    [HttpPost("{id:int}/reviews")]
    public async Task<ReviewResponse> CreateReview(int id, UpsertReviewRequest request, CancellationToken cancellationToken) =>
        await reviews.CreateAsync(CurrentUser.Id(User), id, request, cancellationToken);

    private int? UserIdOrNull() =>
        User.Identity?.IsAuthenticated == true ? CurrentUser.Id(User) : null;
}
