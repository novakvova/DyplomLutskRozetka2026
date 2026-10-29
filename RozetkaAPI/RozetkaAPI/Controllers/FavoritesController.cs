using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/favorites")]
public class FavoritesController(FavoriteService favorites) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<FavoriteResponse>> List(CancellationToken cancellationToken) =>
        await favorites.ListAsync(CurrentUser.Id(User), cancellationToken);

    [HttpPost]
    public async Task<IActionResult> Add(FavoriteRequest request, CancellationToken cancellationToken)
    {
        await favorites.AddAsync(CurrentUser.Id(User), request.ProductId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> Remove(int productId, CancellationToken cancellationToken)
    {
        await favorites.RemoveAsync(CurrentUser.Id(User), productId, cancellationToken);
        return NoContent();
    }
}
