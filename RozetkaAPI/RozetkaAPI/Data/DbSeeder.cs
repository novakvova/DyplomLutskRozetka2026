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
                CreateUser(hasher, "buyer@rozetka.test", "Buyer12345", "Олена", "Коваль", "+380501112233", UserRole.Buyer, false),
                CreateUser(hasher, "blocked@rozetka.test", "Blocked12345", "Ігор", "Блок", null, UserRole.Buyer, true));
            await db.SaveChangesAsync();
        }

        if (!await db.Users.AnyAsync(user => user.Role == UserRole.Admin)
            && !await db.Users.AnyAsync(user => user.Email == "admin@rozetka.test"))
        {
            db.Users.Add(CreateUser(hasher, "admin@rozetka.test", "Admin12345", "Адмін", "Магазину", null, UserRole.Admin, false));
            await db.SaveChangesAsync();
        }

        foreach (var name in new[] { "Смартфони", "Ноутбуки", "Аудіо", "Побутова техніка" })
        {
            if (!await db.Categories.AnyAsync(category => category.Name == name))
                db.Categories.Add(new Category { Name = name });
        }

        await db.SaveChangesAsync();
        await SeedShowcaseAsync(db);

        if (await db.Products.AnyAsync())
            return;

        var categories = await db.Categories.ToDictionaryAsync(category => category.Name);
        var products = new List<Product>
        {
            Product(categories["Смартфони"], "Смартфон Nova X 128 ГБ",
                "Екран 6,5 дюйма, 128 ГБ пам’яті і батарея на день без підзарядки.",
                "Nova X розрахований на щоденне користування: дзвінки, месенджери і фото при денному світлі. Корпус не ковзає, а зарядки вистачає від ранку до вечора.",
                18999, 11, "/products/phone.svg", "https://example.com/nova",
                [("Екран", "6,5 дюйма"), ("Пам’ять", "128 ГБ"), ("Батарея", "5000 мА·год")]),
            Product(categories["Ноутбуки"], "Ноутбук StudyBook 15",
                "15-дюймовий ноутбук для навчання: 16 ГБ оперативної пам’яті і SSD на 512 ГБ.",
                "StudyBook тримає кілька вкладок, редактор і відеодзвінок одночасно. Клавіатура з підсвіткою, вага дозволяє носити його на пари.",
                32999, 5, "/products/laptop.svg", "https://example.com/studybook",
                [("Екран", "15,6 дюйма"), ("Пам’ять", "16 ГБ"), ("Накопичувач", "SSD 512 ГБ")]),
            Product(categories["Аудіо"], "Навушники SoundMini",
                "Бездротові навушники з шумозаглушенням і кейсом на 24 години роботи.",
                "SoundMini прибирають шум транспорту і тримають заряд разом із кейсом добу. Керування гучністю на корпусі.",
                2499, 30, "/products/headphones.svg", "https://example.com/soundmini",
                [("Тип", "Вкладні"), ("Зв’язок", "Bluetooth"), ("Час роботи", "24 години з кейсом")]),
            Product(categories["Побутова техніка"], "Пральна машина CleanHome 7 кг",
                "Вузька машина на 7 кг із швидким циклом і віджимом до 1200 обертів.",
                "CleanHome ставиться у вузьку нішу. Швидкий цикл підходить для щоденних речей, віджим не лишає білизну мокрою.",
                16499, 4, "/products/washer.svg", "https://example.com/cleanhome",
                [("Завантаження", "7 кг"), ("Віджим", "1200 об/хв"), ("Глибина", "40 см")]),
            Product(categories["Побутова техніка"], "Електрочайник Glass 1,7 л",
                "Скляний чайник з підсвіткою і захистом від увімкнення без води.",
                "Glass кип’ятить 1,7 літра і вимикається, якщо води немає. Підсвітка видно, скільки води лишилось.",
                899, 18, "/products/kettle.svg", "https://example.com/glass",
                [("Об’єм", "1,7 л"), ("Потужність", "2200 Вт"), ("Матеріал", "Скло")]),
            Product(categories["Побутова техніка"], "Робот-пилосос HomeRun S8",
                "Прибирає сухе сміття і будує карту кімнати. Зараз позиції немає на складі.",
                "HomeRun S8 об’їжджає меблі і повертається на станцію. Зараз усі одиниці розібрані.",
                12999, 0, "/products/vacuum.svg", "https://example.com/homerun",
                [("Прибирання", "Сухе"), ("Навігація", "Карта кімнати"), ("Станція", "Зарядна")])
        };
        products[0].Images.Add(new ProductImage { Url = "/products/phone-back.svg", SortOrder = 1 });

        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        var buyer = await db.Users.SingleAsync(user => user.Email == "buyer@rozetka.test");
        var phone = products[0];
        db.Orders.Add(new CustomerOrder
        {
            UserId = buyer.Id,
            Status = OrderStatus.Completed,
            RecipientName = "Олена Коваль",
            Phone = "+380501112233",
            City = "Луцьк",
            DeliveryMethod = "nova_poshta",
            DeliveryAddress = "Відділення №3",
            PaymentMethod = "cash_on_delivery",
            Total = phone.Price,
            CreatedAt = DateTime.UtcNow.AddDays(-6),
            Items =
            [
                new OrderItem
                {
                    ProductId = phone.Id,
                    ProductName = phone.Name,
                    UnitPrice = phone.Price,
                    Quantity = 1
                }
            ]
        });
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

    private static Product Product(
        Category category,
        string name,
        string summary,
        string description,
        decimal price,
        int stock,
        string image,
        string manufacturer,
        (string Name, string Value)[] specs) => new()
    {
        Category = category,
        Name = name,
        ShortDescription = summary,
        FullDescription = description,
        Price = price,
        Stock = stock,
        ImageUrl = image,
        ManufacturerUrl = manufacturer,
        Images = [new ProductImage { Url = image, SortOrder = 0 }],
        Characteristics = specs.Select((spec, index) => new ProductCharacteristic
        {
            Name = spec.Name,
            Value = spec.Value,
            SortOrder = index
        }).ToList()
    };

    private static async Task SeedShowcaseAsync(AppDbContext db)
    {
        foreach (var name in new[]
        {
            "Енергонезалежність", "Ноутбуки та комп’ютери", "Смартфони, ТВ і електроніка",
            "Товари для геймерів", "Товари для дому", "Авто і мото", "Інструменти та обладнання",
            "Сантехніка та ремонт", "Дача, сад і город", "Спорт і захоплення", "Одяг, взуття та прикраси",
            "Краса та здоров’я", "Дитячі товари", "Зоотовари", "Офіс, школа, книги", "Побутова хімія",
            "Телевізори"
        })
        {
            if (!await db.Categories.AnyAsync(category => category.Name == name))
                db.Categories.Add(new Category { Name = name });
        }

        await db.SaveChangesAsync();
        if (await db.Products.AnyAsync(product => product.Name.Contains("Vivobook 16 M1607KA")))
            return;

        var notebooks = await db.Categories.SingleAsync(category => category.Name == "Ноутбуки");
        db.Products.AddRange(
            Showcase(notebooks, "Ноутбук ASUS Vivobook 16 M1607KA-MB264 (90NB15F1-M00KNO) Quiet Blue", 41999, 56499, 7,
                "16-дюймовий ноутбук для навчання і роботи. Ryzen 7, 16 ГБ пам’яті.",
                [("Екран", "16\" IPS, 1920×1200, 60 Гц"), ("Процесор", "AMD Ryzen 7 7735HS"), ("Оперативна памʼять", "16 ГБ DDR5"), ("Накопичувач", "SSD 512 ГБ"), ("Бренд", "ASUS")]),
            Showcase(notebooks, "Ноутбук Lenovo IdeaPad Slim 3", 27999, null, 11,
                "15,6 дюйма, вистачає для пар і документів.",
                [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "Lenovo")]),
            Showcase(notebooks, "Ноутбук Acer Aspire Lite 15", 21499, 24999, 4,
                "Легкий ноутбук для навчання.",
                [("Екран", "15,6\""), ("Процесор", "AMD Ryzen 5"), ("Оперативна памʼять", "8 ГБ"), ("Бренд", "Acer")]),
            Showcase(notebooks, "Ноутбук HP Pavilion 15", 31999, null, 6,
                "Повсякденний ноутбук HP.",
                [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "HP")]),
            Showcase(notebooks, "Ноутбук ASUS Zenbook 14 OLED", 52999, 58999, 3,
                "OLED-екран і тонкий корпус.",
                [("Екран", "14\" OLED"), ("Процесор", "Intel Core i7"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "ASUS")]),
            Showcase(notebooks, "Ноутбук Dell Inspiron 15 3530", 28499, null, 8,
                "Робочий ноутбук Dell.",
                [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "8 ГБ"), ("Бренд", "Dell")]));
        await db.SaveChangesAsync();
    }

    private static Product Showcase(
        Category category,
        string name,
        decimal price,
        decimal? oldPrice,
        int stock,
        string summary,
        (string Name, string Value)[] specs) => new()
    {
        Category = category,
        Name = name,
        ShortDescription = summary,
        FullDescription = summary,
        Price = price,
        OldPrice = oldPrice,
        Stock = stock,
        ImageUrl = "/hopely/laptop.svg",
        Images = [new ProductImage { Url = "/hopely/laptop.svg", SortOrder = 0 }],
        Characteristics = specs.Select((spec, index) => new ProductCharacteristic
        {
            Name = spec.Name,
            Value = spec.Value,
            SortOrder = index
        }).ToList()
    };

    private static User CreateUser(
        IPasswordHasher<User> hasher,
        string email,
        string password,
        string firstName,
        string lastName,
        string? phone,
        UserRole role,
        bool isBlocked)
    {
        var user = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Phone = phone,
            Role = role,
            IsBlocked = isBlocked,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        return user;
    }
}
