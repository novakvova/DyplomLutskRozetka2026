using Microsoft.EntityFrameworkCore;
using RozetkaAPI.Entities;

namespace RozetkaAPI.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Category> Categories => Set<Category>(); // Додали Categories
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<CustomerOrder> Orders => Set<CustomerOrder>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.Email).HasMaxLength(256);
            entity.Property(user => user.PasswordHash).HasMaxLength(500);
            entity.Property(user => user.FirstName).HasMaxLength(40);
            entity.Property(user => user.LastName).HasMaxLength(40);
            entity.Property(user => user.Phone).HasMaxLength(20);
            entity.Property(user => user.GoogleSubject).HasMaxLength(128);
            entity.HasIndex(user => user.Email).IsUnique();
            entity.HasIndex(user => user.GoogleSubject).IsUnique();
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.Property(token => token.TokenHash).HasMaxLength(64);
            entity.HasIndex(token => token.TokenHash).IsUnique();
            entity.HasOne(token => token.User)
                .WithMany(user => user.PasswordResetTokens)
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Налаштування Category
        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(100);
            entity.Property(c => c.Description).HasMaxLength(500);
        });

        // Налаштування Product та зв'язку з Category
        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(product => product.Name).HasMaxLength(160);
            entity.Property(product => product.ShortDescription).HasMaxLength(1000);
            entity.Property(product => product.Price).HasPrecision(12, 2);

            // Зв'язок із категорією
            entity.HasOne(product => product.Category)
                .WithMany(category => category.Products)
                .HasForeignKey(product => product.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasIndex(item => new { item.UserId, item.ProductId }).IsUnique();
            entity.HasOne(item => item.User).WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Product).WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Favorite>(entity =>
        {
            entity.HasKey(favorite => new { favorite.UserId, favorite.ProductId });
            entity.HasOne(favorite => favorite.User).WithMany().HasForeignKey(favorite => favorite.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(favorite => favorite.Product).WithMany().HasForeignKey(favorite => favorite.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CustomerOrder>(entity =>
        {
            entity.ToTable("Orders");
            entity.Property(order => order.RecipientName).HasMaxLength(80);
            entity.Property(order => order.Phone).HasMaxLength(20);
            entity.Property(order => order.City).HasMaxLength(80);
            entity.Property(order => order.DeliveryMethod).HasMaxLength(32);
            entity.Property(order => order.DeliveryAddress).HasMaxLength(200);
            entity.Property(order => order.PaymentMethod).HasMaxLength(32);
            entity.Property(order => order.Comment).HasMaxLength(500);
            entity.Property(order => order.Total).HasPrecision(12, 2);
            entity.HasOne(order => order.User).WithMany().HasForeignKey(order => order.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.Property(item => item.ProductName).HasMaxLength(160);
            entity.Property(item => item.UnitPrice).HasPrecision(12, 2);
            entity.HasOne(item => item.Order).WithMany(order => order.Items).HasForeignKey(item => item.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Review>(entity =>
        {
        entity