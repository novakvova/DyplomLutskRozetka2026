using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();

        if (!await db.Users.AnyAsync())
        {
            db.Users.AddRange(
                CreateUser(hasher, "buyer@rozetka.test", "Buyer12345", "Олена", "Коваль", "+380501112233", false),
                CreateUser(hasher, "blocked@rozetka.test", "Blocked12345", "Ігор", "Блок", null, true));
            await db.SaveChangesAsync();
        }

        if (await db.Products.AnyAsync())
            return;

        var products = new List<Product>
        {
            new()
            {
                Name = "Смартфон Nova X 128 ГБ",
                ShortDescription = "Екран 6,5 дюйма, 128 ГБ пам’яті і батарея на день без підзарядки.",
                Price = 18999,
                Stock = 12
            },
            new()
            {
                Name = "Ноутбук StudyBook 15",
                ShortDescription = "15-дюймовий ноутбук для навчання: 16 ГБ оперативної пам’яті і SSD на 512 ГБ.",
                Price = 32999,
                Stock = 5
            },
            new()
            {
                Name = "Навушники SoundMini",
                ShortDescription = "Бездротові навушники з шумозаглушенням і кейсом на 24 години роботи.",
                Price = 2499,
                Stock = 30
            },
            new()
            {
                Name = "Пральна машина CleanHome 7 кг",
                ShortDescription = "Вузька машина на 7 кг із швидким циклом і віджимом до 1200 обертів.",
                Price = 16499,
                Stock = 4
            },
            new()
            {
                Name = "Електрочайник Glass 1,7 л",
                ShortDescription = "Скляний чайник з підсвіткою і захистом від увімкнення без води.",
                Price = 899,
                Stock = 18
            },
            new()
            {
                Name = "Робот-пилосос HomeRun S8",
                ShortDescription = "Прибирає сухе сміття і будує карту кімнати. Зараз позиції немає на складі.",
                Price = 12999,
                Stock = 0
            }
        };

        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        var buyer = await db.Users.SingleAsync(user => user.Email == "buyer@rozetka.test");
        var phone = products[0];
        db.Reviews.Add(new Review
        {
            UserId = buyer.Id,
            ProductId = phone.Id,
            Rating = 5,
            Text = "Тримає заряд увесь день, екран яскравий навіть на вулиці.",
            CreatedAt = DateTime.UtcNow.AddDays(-4)
        });
        await db.SaveChangesAsync();
    }

    private static User CreateUser(
        IPasswordHasher<User> hasher,
        string email,
        string password,
        string firstName,
        string lastName,
        string? phone,
        bool isBlocked)
    {
        var user = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Phone = phone,
            Role = UserRole.Buyer,
            IsBlocked = isBlocked,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        return user;
    }
}
