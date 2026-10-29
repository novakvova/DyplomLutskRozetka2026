# Проект Rozetka

Дипломний інтернет-магазин. Гілка `artem-dets` містить авторизацію і сценарії зареєстрованого покупця: профіль, кошик, обране, замовлення і відгуки.

Каталог з пошуком і категоріями, а також адмінка, залишаються окремою частиною. Список товарів тут лише для того, щоб покупець міг додати позицію в кошик.

## Локально

Потрібні .NET SDK 10, Node.js 22 і PostgreSQL 16.

```bash
docker compose up -d db
```

Або підніміть PostgreSQL самі з базою `rozetka`, користувачем `rozetka` і паролем `rozetka` на порту 5432. Рядок підключення лежить в `RozetkaAPI/RozetkaAPI/appsettings.json`.

```bash
dotnet run --project RozetkaAPI/RozetkaAPI
cd vite-rozetka
npm install
npm run dev
```

API: http://localhost:5224/swagger  
Сайт: http://localhost:43123

Демо-покупець: `buyer@rozetka.test` / `Buyer12345`.  
Заблокований акаунт: `blocked@rozetka.test` / `Blocked12345`.

У режимі Development посилання для відновлення пароля з’являється на сторінці і в логах API. Пошта назовні не відправляється.

Вхід через Google потребує `Google:ClientId` в конфігурації API і `VITE_GOOGLE_CLIENT_ID` для фронтенда.

Ключ `Jwt:Key` у репозиторії лише для локальної роботи. Перед публічним розгортанням його треба замінити.
