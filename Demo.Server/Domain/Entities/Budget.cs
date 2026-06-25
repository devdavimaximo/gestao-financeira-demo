using Demo.Server.Domain.Enums;

namespace Demo.Server.Domain.Entities;

public class Budget
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal UsedAmount { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public BudgetStatus Status { get; set; } = BudgetStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public decimal AvailableAmount => TotalAmount - UsedAmount;

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public ICollection<Purchase> Purchases { get; set; } = [];
}
