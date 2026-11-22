using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(CatalogService catalog) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CategoryResponse>> List(CancellationToken cancellationToken) =>
        await catalog.CategoriesAsync(cancellationToken);
}
