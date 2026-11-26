using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RozetkaAPI.Contracts;
using RozetkaAPI.Services;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<AuthResponse> Register(RegisterRequest request, CancellationToken cancellationToken) =>
        await auth.RegisterAsync(request, cancellationToken);

    [HttpPost("login")]
    public async Task<AuthResponse> Login(LoginRequest request, CancellationToken cancellationToken) =>
        await auth.LoginAsync(request, cancellationToken);

    [HttpGet("providers")]
    public AuthProvidersResponse Providers() => auth.Providers();

    [HttpPost("google")]
    public async Task<AuthResponse> Google(GoogleLoginRequest request, CancellationToken cancellationToken) =>
        await auth.LoginWithGoogleAsync(request, cancellationToken);

    [HttpPost("apple")]
    public async Task<AuthResponse> Apple(AppleLoginRequest request, CancellationToken cancellationToken) =>
        await auth.LoginWithAppleAsync(request, cancellationToken);

    [HttpPost("forgot-password")]
    public async Task<MessageResponse> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken) =>
        await auth.ForgotPasswordAsync(request, cancellationToken);

    [HttpPost("reset-password")]
    public async Task<MessageResponse> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await auth.ResetPasswordAsync(request, cancellationToken);
        return new MessageResponse("Пароль оновлено. Тепер можна увійти.");
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => NoContent();
}
