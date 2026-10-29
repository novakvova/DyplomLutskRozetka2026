using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class TokenService(IConfiguration configuration)
{
    public string Create(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Required("Jwt:Key")));
        var hours = configuration.GetValue("Jwt:ExpiresHours", 12);
        var token = new JwtSecurityToken(
            issuer: Required("Jwt:Issuer"),
            audience: Required("Jwt:Audience"),
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            ],
            expires: DateTime.UtcNow.AddHours(hours),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string Required(string key)
    {
        return configuration[key] ?? throw new InvalidOperationException($"У конфігурації немає {key}.");
    }
}
