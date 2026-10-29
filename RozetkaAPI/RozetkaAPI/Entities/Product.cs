namespace RozetkaAPI.Entities;

// Категорії, характеристики і посилання на сайт виробника належать частині каталогу.
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string ShortDescription { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
