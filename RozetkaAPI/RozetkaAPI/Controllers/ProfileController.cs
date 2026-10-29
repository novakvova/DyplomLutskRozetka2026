using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController(AuthService auth) : ControllerBase
{
    [HttpGet]
    public async Task<UserResponse> Get(CancellationToken cancellationToken) =>
        await auth.GetProfileAsync(CurrentUser.Id(User), cancellationToken);

    [HttpPut]
    public async Task<UserResponse> Update(UpdateProfileRequest request, CancellationToken cancellationToken) =>
        await auth.UpdateProfileAsync(CurrentUser.Id(User), request, cancellationToken);

    [HttpPut("password")]
    public async Task<MessageResponse> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await auth.ChangePasswordAsync(CurrentUser.Id(User), request, cancellationToken);
        return new MessageResponse("Пароль оновлено.");
    }
}
