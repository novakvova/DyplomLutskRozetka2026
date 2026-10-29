using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Common;
using RozetkaAPI.Contracts;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Services;

public class AuthService(
    AppDbContext db,
    IPasswordHasher<User> hasher,
    TokenService tokens,
    IConfiguration configuration,
    ILogger<AuthService> logger)
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = InputRules.Email(request.Email);
        InputRules.Password(request.Password);
        var firstName = InputRules.PersonName(request.FirstName, "Ім’я");
        var lastName = InputRules.PersonName(request.LastName, "Прізвище");
        var phone = InputRules.Phone(request.Phone, required: false);

        if (await db.Users.AnyAsync(user => user.Email == email, cancellationToken))
            throw new AppException(StatusCodes.Status409Conflict, "Користувач з такою поштою вже існує.");

        var user = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Phone = phone,
            Role = UserRole.Buyer,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return Issue(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = InputRules.Email(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(item => item.Email == email, cancellationToken);
        if (user?.PasswordHash is null ||
            hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password ?? "") == PasswordVerificationResult.Failed)
            throw new AppException(StatusCodes.Status401Unauthorized, "Невірна пошта або пароль.");

        EnsureActive(user);
        return Issue(user);
    }

    public async Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        var clientId = configuration["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new AppException(StatusCodes.Status400BadRequest, "Вхід через Google ще не налаштований.");

        if (string.IsNullOrWhiteSpace(request.IdToken))
            throw new AppException(StatusCodes.Status400BadRequest, "Google не передав токен.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [clientId]
            });
        }
        catch (InvalidJwtException)
        {
            throw new AppException(StatusCodes.Status401Unauthorized, "Не вдалося підтвердити вхід через Google.");
        }

        if (payload.EmailVerified != true || string.IsNullOrWhiteSpace(payload.Email))
            throw new AppException(StatusCodes.Status400BadRequest, "Google не підтвердив електронну пошту.");

        var email = InputRules.Email(payload.Email);
        var user = await db.Users.SingleOrDefaultAsync(item => item.GoogleSubject == payload.Subject, cancellationToken);
        if (user is null)
        {
            user = await db.Users.SingleOrDefaultAsync(item => item.Email == email, cancellationToken);
            if (user is null)
            {
                user = new User
                {
                    Email = email,
                    GoogleSubject = payload.Subject,
                    FirstName = GoogleName(payload.GivenName, "Покупець"),
                    LastName = GoogleName(payload.FamilyName, "Google"),
                    Role = UserRole.Buyer,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);
            }
            else if (user.GoogleSubject is null)
            {
                user.GoogleSubject = payload.Subject;
            }
            else if (user.GoogleSubject != payload.Subject)
            {
                throw new AppException(StatusCodes.Status409Conflict, "Ця пошта вже прив’язана до іншого входу Google.");
            }
        }

        EnsureActive(user);
        await db.SaveChangesAsync(cancellationToken);
        return Issue(user);
    }

    public async Task<MessageResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        const string generic = "Якщо обліковий запис існує, ми підготували посилання для нового пароля.";
        var email = InputRules.Email(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(item => item.Email == email, cancellationToken);
        if (user is null || user.IsBlocked || user.PasswordHash is null)
            return new MessageResponse(generic);

        var previous = await db.PasswordResetTokens
            .Where(token => token.UserId == user.Id && token.UsedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in previous)
            token.UsedAt = DateTime.UtcNow;

        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = Hash(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
        await db.SaveChangesAsync(cancellationToken);

        var frontend = configuration["Auth:FrontendUrl"] ?? "http://localhost:43123";
        var resetUrl = $"{frontend.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(rawToken)}";
        var expose = configuration.GetValue("Auth:ExposeResetLink", false);
        if (expose)
            logger.LogInformation("Посилання для відновлення пароля {Email}: {ResetUrl}", user.Email, resetUrl);

        return new MessageResponse(generic, expose ? resetUrl : null);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        InputRules.Password(request.NewPassword);
        if (string.IsNullOrWhiteSpace(request.Token))
            throw new AppException(StatusCodes.Status400BadRequest, "Посилання для відновлення недійсне.");

        var hash = Hash(request.Token.Trim());
        var reset = await db.PasswordResetTokens
            .Include(token => token.User)
            .SingleOrDefaultAsync(token => token.TokenHash == hash, cancellationToken);

        if (reset is null || reset.UsedAt is not null || reset.ExpiresAt < DateTime.UtcNow)
            throw new AppException(StatusCodes.Status400BadRequest, "Посилання для відновлення недійсне або прострочене.");

        EnsureActive(reset.User);
        reset.UsedAt = DateTime.UtcNow;
        reset.User.PasswordHash = hasher.HashPassword(reset.User, request.NewPassword);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserResponse> GetProfileAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await FindActiveAsync(userId, cancellationToken);
        return ToResponse(user);
    }

    public async Task<UserResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await FindActiveAsync(userId, cancellationToken);
        var email = InputRules.Email(request.Email);
        if (email != user.Email && await db.Users.AnyAsync(item => item.Email == email, cancellationToken))
            throw new AppException(StatusCodes.Status409Conflict, "Користувач з такою поштою вже існує.");

        user.Email = email;
        user.FirstName = InputRules.PersonName(request.FirstName, "Ім’я");
        user.LastName = InputRules.PersonName(request.LastName, "Прізвище");
        user.Phone = InputRules.Phone(request.Phone, required: false);
        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(user);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await FindActiveAsync(userId, cancellationToken);
        InputRules.Password(request.NewPassword);
        if (user.PasswordHash is not null)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
                throw new AppException(StatusCodes.Status400BadRequest, "Поточний пароль невірний.");
        }

        user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<User> FindActiveAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(item => item.Id == userId, cancellationToken)
            ?? throw new AppException(StatusCodes.Status401Unauthorized, "Сесія недійсна. Увійдіть знову.");
        EnsureActive(user);
        return user;
    }

    private AuthResponse Issue(User user) => new(tokens.Create(user), ToResponse(user));

    private static void EnsureActive(User user)
    {
        if (user.IsBlocked)
            throw new AppException(StatusCodes.Status403Forbidden, "Обліковий запис заблоковано.");
    }

    public static UserResponse ToResponse(User user) => new(
        user.Id,
        user.Email,
        user.FirstName,
        user.LastName,
        user.Phone,
        user.Role.ToString(),
        user.PasswordHash is not null);

    private static string GoogleName(string? value, string fallback)
    {
        var name = value?.Trim() ?? "";
        return name.Length is >= 2 and <= 40 ? name : fallback;
    }

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
