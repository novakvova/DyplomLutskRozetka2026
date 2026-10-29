using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RozetkaAPI.Common;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;
using RozetkaAPI.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var message = context.ModelState.Values
            .SelectMany(entry => entry.Errors)
            .Select(error => error.ErrorMessage)
            .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text))
            ?? "Перевірте заповнені поля.";
        return new BadRequestObjectResult(new { message });
    };
});

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("У конфігурації немає рядка підключення Default.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<FavoriteService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<ReviewService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("У конфігурації немає Jwt:Key.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var subject = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(subject, out var userId))
                {
                    context.Fail("Сесія недійсна.");
                    return;
                }

                var database = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var blocked = await database.Users.AsNoTracking()
                    .Where(user => user.Id == userId)
                    .Select(user => (bool?)user.IsBlocked)
                    .FirstOrDefaultAsync();
                if (blocked is null or true)
                    context.Fail("Обліковий запис заблоковано.");
            }
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
    });
});

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Rozetka API", Version = "v1" });
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Вставте JWT. Префікс Bearer Swagger додасть сам."
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});

var app = builder.Build();

app.UseExceptionHandler(handler =>
{
    handler.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        if (exception is AppException appException)
        {
            context.Response.StatusCode = appException.StatusCode;
            await context.Response.WriteAsJsonAsync(new { message = appException.Message });
            return;
        }

        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(exception, "Необроблена помилка");
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = "Сталася помилка сервера." });
    });
});

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await MigrateAndSeedAsync(app);
app.Run();

static async Task MigrateAndSeedAsync(WebApplication app)
{
    const int attempts = 10;
    for (var attempt = 1; attempt <= attempts; attempt++)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await database.Database.MigrateAsync();
            await DbSeeder.SeedAsync(scope.ServiceProvider);
            return;
        }
        catch (Exception exception) when (attempt < attempts)
        {
            var logger = app.Services.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(exception, "База ще недоступна, спроба {Attempt}", attempt);
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
    }
}

public partial class Program;
