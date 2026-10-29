using System.Net.Mail;

namespace RozetkaAPI.Common;

public static class InputRules
{
    public static string Email(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        try
        {
            var parsed = new MailAddress(email);
            if (parsed.Address != email || !email.Contains('.'))
                throw new FormatException();
        }
        catch (FormatException)
        {
            throw new AppException(StatusCodes.Status400BadRequest, "Вкажіть коректну електронну пошту.");
        }

        return email;
    }

    public static string PersonName(string? value, string label)
    {
        var name = value?.Trim() ?? "";
        if (name.Length < 2 || name.Length > 40)
            throw new AppException(StatusCodes.Status400BadRequest, $"{label} має містити від 2 до 40 символів.");

        return name;
    }

    public static string? Phone(string? value, bool required)
    {
        var phone = new string((value ?? "").Where(c => !char.IsWhiteSpace(c)).ToArray());
        if (phone.Length == 0)
        {
            if (required)
                throw new AppException(StatusCodes.Status400BadRequest, "Вкажіть номер телефону.");
            return null;
        }

        var digits = phone.Count(char.IsDigit);
        if (phone.Any(c => c != '+' && !char.IsDigit(c)) || phone.Count(c => c == '+') > 1 || digits < 10 || digits > 15)
            throw new AppException(StatusCodes.Status400BadRequest, "Телефон має містити від 10 до 15 цифр.");

        return phone;
    }

    public static void Password(string? value)
    {
        var password = value ?? "";
        var longEnough = password.Length >= 8 && password.Length <= 72;
        var hasLetter = password.Any(char.IsLetter);
        var hasDigit = password.Any(char.IsDigit);
        if (!longEnough || !hasLetter || !hasDigit)
            throw new AppException(StatusCodes.Status400BadRequest, "Пароль має містити від 8 до 72 символів, хоча б одну літеру і одну цифру.");
    }

    public static string RequiredText(string? value, string label, int max)
    {
        var text = value?.Trim() ?? "";
        if (text.Length == 0)
            throw new AppException(StatusCodes.Status400BadRequest, $"Вкажіть: {label.ToLowerInvariant()}.");
        if (text.Length > max)
            throw new AppException(StatusCodes.Status400BadRequest, $"{label} має містити до {max} символів.");

        return text;
    }
}
