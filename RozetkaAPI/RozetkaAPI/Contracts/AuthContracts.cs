namespace RozetkaAPI.Contracts;

public record UserResponse(
    int Id,
    string Email,
    string FirstName,
    string LastName,
    string? Phone,
    string Role,
    bool HasPassword);

public record AuthResponse(string AccessToken, UserResponse User);

public record MessageResponse(string Message, string? ResetUrl = null);

public record RegisterRequest(string Email, string Password, string FirstName, string LastName, string? Phone);

public record LoginRequest(string Email, string Password);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);

public record GoogleLoginRequest(string IdToken);

public record UpdateProfileRequest(string Email, string FirstName, string LastName, string? Phone);

public record ChangePasswordRequest(string? CurrentPassword, string NewPassword);
