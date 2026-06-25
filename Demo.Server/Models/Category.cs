namespace Demo.Server.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#6366f1";
    public string Icon { get; set; } = "tag";
    public CategoryType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Transaction> Transactions { get; set; } = [];
}

public enum CategoryType
{
    Income,
    Expense,
    Both
}
