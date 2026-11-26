using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using RozetkaAPI.Common;

namespace RozetkaAPI.Services;

public class AppleSignIn(IHttpClientFactory http, IConfiguration configuration)
{
    public async Task<(string Subject, string Email)> ValidateAsync(string? idToken, CancellationToken cancellationToken)
    {
        var clientId = configuration["Apple:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new AppException(StatusCodes.Status400BadRequest, "Вхід через Apple ще не налаштований.");
        if (string.IsNullOrWhiteSpace(idToken))
            throw new AppException(StatusCodes.Status400BadRequest, "Apple не передав токен.");

        var keysJson = await http.CreateClient("apple").GetStringAsync("https://appleid.apple.com/auth/keys", cancellationToken);
        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var result = await handler.ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuer = "https://appleid.apple.com",
            ValidAudience = clientId,
            IssuerSigningKeys = new JsonWebKeySet(keysJson).GetSigningKeys(),
            ValidateLifetime = true
        });

        if (!result.IsValid)
            throw new AppException(StatusCodes.Status401Unauthorized, "Не вдалося підтвердити вхід через Apple.");

        var email = result.ClaimsIdentity.FindFirst("email")?.Value;
        var verified = result.ClaimsIdentity.FindFirst("email_verified")?.Value;
        if (string.IsNullOrWhiteSpace(email) || verified is "false")
            throw new AppException(StatusCodes.Status400BadRequest, "Apple не підтвердив електронну пошту.");

        var subject = result.ClaimsIdentity.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(subject))
            throw new AppException(StatusCodes.Status401Unauthorized, "Не вдалося підтвердити вхід через Apple.");

        return (subject, email);
    }
}
