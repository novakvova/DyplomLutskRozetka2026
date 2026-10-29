namespace RozetkaAPI.Entities;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public CustomerOrder Order { get; set; } = null!;
    public int ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
