using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(AppDbContext context) : ControllerBase
{
    // GET: api/users (Отримання списку всіх користувачів для адмін-панелі)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        return await context.Users
            .Select(u => new User
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Phone = u.Phone,
                Role = u.Role,
                IsBlocked = u.IsBlocked,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    // GET: api/users/5 (Отримання конкретного користувача)
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        var user = await context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound();
        }

        return new User
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Phone = user.Phone,
            Role = user.Role,
            IsBlocked = user.IsBlocked,
            CreatedAt = user.CreatedAt
        };
    }

    // PATCH: api/users/5/block (Блокування / розблокування користувача)
    [HttpPatch("{id}/block")]
    public async Task<IActionResult> ToggleBlockUser(int id)
    {
        var user = await context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound();
        }

        // Інвертуємо статус блокування
        user.IsBlocked = !user.IsBlocked;
        await context.SaveChangesAsync();

        return NoContent();
    }
}