using Demo.Server.Domain.Enums;

namespace Demo.Server.Domain.Entities;

public class Unit
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public UnitStatus Status { get; set; } = UnitStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserUnit> UserUnits { get; set; } = [];
    public ICollection<FinancialEntry> FinancialEntries { get; set; } = [];
    public ICollection<AccountPayable> AccountsPayable { get; set; } = [];
    public ICollection<AccountReceivable> AccountsReceivable { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
    public ICollection<Purchase> Purchases { get; set; } = [];
    public ICollection<Alert> Alerts { get; set; } = [];
}
