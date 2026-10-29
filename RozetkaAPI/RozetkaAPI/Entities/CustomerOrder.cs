namespace RozetkaAPI.Entities;

public class CustomerOrder
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public OrderStatus Status { get; set; } = OrderStatus.New;
    public string RecipientName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
    public string DeliveryMethod { get; set; } = "";
    public string DeliveryAddress { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public string? Comment { get; set; }
    public decimal Total { get; set; }
    public ICollection<OrderItem> Items { get; set; } = [];
}

public enum OrderStatus
{
    New,
    AwaitingPayment,
    Processing,
    Completed,
    Cancelled
}
