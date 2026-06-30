using Demo.Server.Domain.Enums;

namespace Demo.Server.Domain.Entities;

public class Alert
{
    public Guid Id { get; set; }
    public AlertType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ReferenceId { get; set; }
    public DateOnly? DueDate { get; set; }

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;
}
