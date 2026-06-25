using Demo.Server.Domain.Enums;

namespace Demo.Server.Domain.Entities;

public class AccountReceivable
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal ExpectedAmount { get; set; }
    public decimal? ReceivedAmount { get; set; }
    public DateOnly ExpectedDate { get; set; }
    public DateOnly? ReceivedDate { get; set; }
    public AccountReceivableStatus Status { get; set; } = AccountReceivableStatus.Pending;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public FinancialCategory Category { get; set; } = null!;

    public Guid? PaymentMethodId { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
}
