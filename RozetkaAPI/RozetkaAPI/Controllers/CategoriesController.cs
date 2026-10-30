using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Data;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(AppDbContext context) : ControllerBase
{
    // GET: api/categories (Получение всех категорий для каталога)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
    {
        return await context.Categories.ToListAsync();
    }

    // GET: api/categories/5 (Получение конкретной категории)
    [HttpGet("{id}")]
    public async Task<ActionResult<Category>> GetCategory(int id)
    {
        var category = await context.Categories.FindAsync(id);

        if (category == null)
        {
            return NotFound();
        }

        return category;
    }

    // POST: api/categories (Добавление категории — для админки)
    [HttpPost]
    public async Task<ActionResult<Category>> CreateCategory(Category category)
    {
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }
}