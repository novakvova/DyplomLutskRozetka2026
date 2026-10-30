namespace RozetkaAPI.Entities;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string ShortDescription { get; set; } = "";
    public string FullDescription { get; set; } = string.Empty; // Додали за ТЗ
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;       // Додали за ТЗ
    public string? ManufacturerUrl { get; set; }              // Посилання на сайт виробника за ТЗ
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Зв'язок із категорією (каталог)
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
}