namespace Demo.Server.Models;

public class Budget
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal LimitAmount { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public BudgetStatus Status { get; set; } = BudgetStatus.Active;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum BudgetStatus
{
    Active,
    Exceeded,
    Closed
}
