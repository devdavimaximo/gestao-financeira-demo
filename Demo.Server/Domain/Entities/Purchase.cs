using Demo.Server.Domain.Enums;

namespace Demo.Server.Domain.Entities;

public class Purchase
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly? DueDate { get; set; }
    public PurchaseStatus Status { get; set; } = PurchaseStatus.Confirmed;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public FinancialCategory Category { get; set; } = null!;

    public Guid BudgetId { get; set; }
    public Budget Budget { get; set; } = null!;
}
