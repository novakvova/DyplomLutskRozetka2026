using System.Security.Claims;
using RozetkaAPI.Common;

namespace RozetkaAPI.Common;

public static class CurrentUser
{
    public static int Id(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(value, out var id))
            throw new AppException(StatusCodes.Status401Unauthorized, "Сесія недійсна. Увійдіть знову.");

        return id;
    }
}
