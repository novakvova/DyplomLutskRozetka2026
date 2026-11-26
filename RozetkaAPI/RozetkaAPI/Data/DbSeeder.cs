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
        await DressDemoAsync(db, hasher);

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

    private static async Task DressDemoAsync(AppDbContext db, IPasswordHasher<User> hasher)
    {
        (string Email, string First, string Last)[] people =
        [
            ("review.marko@hopely.test", "Марко", "Шевчук"),
            ("review.anastasia@hopely.test", "Анастасія", "Лисенко"),
            ("review.iryna@hopely.test", "Ірина", "Петренко"),
            ("review.taras@hopely.test", "Тарас", "Мельник")
        ];
        foreach (var person in people)
        {
            if (!await db.Users.AnyAsync(user => user.Email == person.Email))
                db.Users.Add(CreateUser(hasher, person.Email, "Review12345", person.First, person.Last, null, UserRole.Buyer, false));
        }

        await db.SaveChangesAsync();
        var emails = people.Select(person => person.Email).ToArray();
        var reviewers = await db.Users.Where(user => emails.Contains(user.Email)).OrderBy(user => user.Id).ToListAsync();

        foreach (var item in DemoCatalog())
        {
            var category = await db.Categories.SingleOrDefaultAsync(entry => entry.Name == item.Category);
            if (category is null)
                continue;

            var product = await db.Products.Include(entry => entry.Images).FirstOrDefaultAsync(entry => entry.Name == item.Name);
            if (product is null)
            {
                product = Showcase(category, item.Name, item.Price, item.OldPrice, item.Stock, item.Summary, item.Specs);
                product.ImageUrl = item.Image;
                product.Images = [new ProductImage { Url = item.Image, SortOrder = 0 }];
                db.Products.Add(product);
                await db.SaveChangesAsync();
            }
            else if (product.ImageUrl != item.Image || product.Price != item.Price || product.OldPrice != item.OldPrice)
            {
                product.Price = item.Price;
                product.OldPrice = item.OldPrice;
                product.Stock = item.Stock;
                product.ShortDescription = item.Summary;
                product.FullDescription = item.Summary;
                product.ImageUrl = item.Image;
                product.Images.Clear();
                product.Images.Add(new ProductImage { Url = item.Image, SortOrder = 0 });
                await db.SaveChangesAsync();
            }

            var mine = await db.Reviews.Where(review => review.ProductId == product.Id && emails.Contains(review.User.Email)).ToListAsync();
            var lines = new[]
            {
                $"Замовляв «{item.Name}». Приїхав наступного дня, коробка ціла, увімкнувся одразу.",
                "Користуюсь кілька днів. Виглядає так само, як на фото, претензій немає.",
                "За ці гроші дуже добре. Доставка була безкоштовною, як обіцяли від 1 500 грн.",
                "Брав для дому. Налаштував за вечір, усім удома сподобалось."
            };
            for (var index = 0; index < lines.Length && index < reviewers.Count; index++)
            {
                var author = reviewers[index];
                var review = mine.FirstOrDefault(entry => entry.UserId == author.Id);
                if (review is null)
                {
                    db.Reviews.Add(new Review
                    {
                        UserId = author.Id,
                        ProductId = product.Id,
                        Rating = index < 2 ? 5 : 4,
                        Text = lines[index],
                        CreatedAt = DateTime.UtcNow.AddDays(-3 - index)
                    });
                }
                else
                {
                    review.Text = lines[index];
                    review.Rating = index < 2 ? 5 : 4;
                }
            }
        }

        await db.SaveChangesAsync();
    }

    private static DemoProduct[] DemoCatalog() =>
    [
        Item("Смартфони", "Смартфон Nova X 128 ГБ", 16999, 19999, 11, "/products/phone.jpg", "Екран 6,5 дюйма, 128 ГБ і батарея на день.", [("Екран", "6,5\""), ("Пам’ять", "128 ГБ"), ("Бренд", "Nova")]),
        Item("Ноутбуки", "Ноутбук StudyBook 15", 27999, 32999, 5, "/products/studybook.jpg", "15,6 дюйма для навчання: 16 ГБ пам’яті і SSD 512 ГБ.", [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "StudyBook")]),
        Item("Аудіо", "Навушники SoundMini", 2499, 3299, 30, "/products/headphones.jpg", "Бездротові навушники з шумозаглушенням.", [("Тип", "Вкладні"), ("Зв’язок", "Bluetooth"), ("Бренд", "SoundMini")]),
        Item("Побутова техніка", "Пральна машина CleanHome 7 кг", 16499, 18999, 4, "/products/washer.jpg", "Вузька машина на 7 кг, віджим до 1200 обертів.", [("Завантаження", "7 кг"), ("Віджим", "1200 об/хв"), ("Бренд", "CleanHome")]),
        Item("Побутова техніка", "Електрочайник Glass 1,7 л", 899, 1199, 18, "/products/kettle.jpg", "Скляний чайник на 1,7 л з захистом від пустого увімкнення.", [("Об’єм", "1,7 л"), ("Потужність", "2200 Вт"), ("Бренд", "Glass")]),
        Item("Побутова техніка", "Робот-пилосос HomeRun S8", 12999, 15499, 0, "/products/vacuum.jpg", "Будує карту кімнати. Зараз немає на складі.", [("Прибирання", "Сухе"), ("Навігація", "Карта"), ("Бренд", "HomeRun")]),
        Item("Ноутбуки", "Ноутбук ASUS Vivobook 16 M1607KA-MB264 (90NB15F1-M00KNO) Quiet Blue", 41999, 56499, 7, "/products/vivobook.jpg", "16 дюймів, Ryzen 7, 16 ГБ, SSD 512 ГБ.", [("Екран", "16\" IPS, 1920×1200, 60 Гц"), ("Процесор", "AMD Ryzen 7 7735HS"), ("Оперативна памʼять", "16 ГБ DDR5"), ("Накопичувач", "SSD 512 ГБ"), ("Бренд", "ASUS")]),
        Item("Ноутбуки", "Ноутбук Lenovo IdeaPad Slim 3", 27999, 31999, 11, "/products/ideapad.jpg", "Тонкий 15,6-дюймовий ноутбук для щоденної роботи.", [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "Lenovo")]),
        Item("Ноутбуки", "Ноутбук Acer Aspire Lite 15", 21499, 23999, 4, "/products/aspire.jpg", "Легкий ноутбук для навчання і документів.", [("Екран", "15,6\""), ("Процесор", "AMD Ryzen 5"), ("Оперативна памʼять", "8 ГБ"), ("Бренд", "Acer")]),
        Item("Ноутбуки", "Ноутбук HP Pavilion 15", 31999, 35499, 6, "/products/pavilion.jpg", "Повсякденний ноутбук з екраном 15,6 дюйма.", [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "HP")]),
        Item("Ноутбуки", "Ноутбук ASUS Zenbook 14 OLED", 52999, 58999, 3, "/products/zenbook.jpg", "OLED-екран і тонкий корпус.", [("Екран", "14\" OLED"), ("Процесор", "Intel Core i7"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "ASUS")]),
        Item("Ноутбуки", "Ноутбук Dell Inspiron 15 3530", 28499, 31499, 8, "/products/dell.jpg", "Робочий ноутбук Dell на кожен день.", [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "8 ГБ"), ("Бренд", "Dell")]),
        Item("Ноутбуки", "Ноутбук Apple MacBook Air 13 M3", 49999, 54999, 5, "/products/macbook-air.jpg", "13 дюймів, чіп M3, тихий і легкий.", [("Екран", "13,6\""), ("Процесор", "Apple M3"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "Apple")]),
        Item("Ноутбуки", "Ноутбук Apple MacBook Pro 14 M4", 89999, 97999, 2, "/products/macbook-pro.jpg", "14 дюймів для монтажу і важких програм.", [("Екран", "14\""), ("Процесор", "Apple M4"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "Apple")]),
        Item("Товари для геймерів", "Ноутбук ASUS TUF Gaming A15", 44999, 49999, 4, "/products/tuf.jpg", "Ігровий ноутбук з відеокартою і екраном 144 Гц.", [("Екран", "15,6\""), ("Процесор", "AMD Ryzen 7"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "ASUS")]),
        Item("Товари для геймерів", "Ноутбук Lenovo Legion 5", 72999, 79999, 3, "/products/legion.jpg", "Legion для ігор і монтажу.", [("Екран", "16\""), ("Процесор", "AMD Ryzen 7"), ("Оперативна памʼять", "32 ГБ"), ("Бренд", "Lenovo")]),
        Item("Товари для геймерів", "Ноутбук Acer Nitro V 15", 38999, 42999, 6, "/products/nitro.jpg", "Ігровий Acer з швидким екраном.", [("Екран", "15,6\""), ("Процесор", "Intel Core i5"), ("Оперативна памʼять", "16 ГБ"), ("Бренд", "Acer")]),
        Item("Товари для геймерів", "Ігрова консоль PlayStation 5 Slim", 23999, 27999, 9, "/products/console.jpg", "Консоль із приводом Blu-ray і геймпадом.", [("Пам’ять", "1 ТБ"), ("Бренд", "Sony")]),
        Item("Смартфони", "Смартфон Samsung Galaxy A56 8/256 ГБ", 16999, 19999, 14, "/products/galaxy.jpg", "Яскравий екран і зарядка на два дні.", [("Екран", "6,7\""), ("Пам’ять", "256 ГБ"), ("Бренд", "Samsung")]),
        Item("Аудіо", "Навушники Sony WH-1000XM5", 11499, 14999, 8, "/products/headphones-sony.jpg", "Повне шумозаглушення і 30 годин роботи.", [("Тип", "Накладні"), ("Бренд", "Sony")]),
        Item("Телевізори", "Телевізор LG 55 4K UHD", 22999, 27499, 5, "/products/tv.jpg", "55 дюймів, 4K, три HDMI.", [("Екран", "55\""), ("Роздільність", "4K"), ("Бренд", "LG")]),
        Item("Енергонезалежність", "Зарядна станція EcoFlow River 3", 9999, 12499, 7, "/products/power.jpg", "Заряджає ноутбук і роутер під час вимкнення світла.", [("Ємність", "245 Вт·год"), ("Бренд", "EcoFlow")]),
        Item("Смартфони, ТВ і електроніка", "Смарт-годинник Apple Watch SE", 11299, 12999, 10, "/products/watch.jpg", "Сповіщення, пульс і тренування.", [("Корпус", "40 мм"), ("Бренд", "Apple")])
    ];

    private static DemoProduct Item(
        string category,
        string name,
        decimal price,
        decimal? oldPrice,
        int stock,
        string image,
        string summary,
        (string Name, string Value)[] specs) => new(
        category,
        name,
        price,
        oldPrice,
        stock,
        image,
        summary,
        specs,
        [
            (5, "Приїхав наступного дня, коробка ціла. Працює так, як написано в описі."),
            (5, "Користуюсь кілька днів. Збірка акуратна, претензій немає."),
            (4, "За свої гроші дуже добре. Доставка безкоштовна, як і обіцяли від 1 500 грн."),
            (4, "Брав для дому. Налаштував за вечір, дружина теж задоволена.")
        ]);

    private sealed record DemoProduct(
        string Category,
        string Name,
        decimal Price,
        decimal? OldPrice,
        int Stock,
        string Image,
        string Summary,
        (string Name, string Value)[] Specs,
        (int Rating, string Text)[] Reviews);

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
