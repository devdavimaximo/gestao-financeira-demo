using Demo.Server.Domain.Enums;

namespace Demo.Server.Domain.Entities;

public class FinancialEntry
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public FinancialEntryType Type { get; set; }
    public DateOnly Date { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public FinancialCategory Category { get; set; } = null!;

    public Guid PaymentMethodId { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = null!;

    public Guid? SalesChannelId { get; set; }
    public SalesChannel? SalesChannel { get; set; }

    // Recurrence — set on series-parent entries only
    public RecurrenceType? RecurrenceFrequency { get; set; }
    public int? RecurrenceInterval { get; set; }
    public DateOnly? RecurrenceEndDate { get; set; }

    // Null = standalone or series parent; non-null = child of a recurring series
    public Guid? ParentEntryId { get; set; }
}
