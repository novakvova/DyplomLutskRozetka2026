using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/reviews")]
public class ReviewsController(ReviewService reviews) : ControllerBase
{
    [HttpPut("{id:int}")]
    public async Task<ReviewResponse> Update(int id, UpsertReviewRequest request, CancellationToken cancellationToken) =>
        await reviews.UpdateAsync(CurrentUser.Id(User), id, request, cancellationToken);
}
