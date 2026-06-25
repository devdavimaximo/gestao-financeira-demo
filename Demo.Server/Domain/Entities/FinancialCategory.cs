namespace Demo.Server.Domain.Entities;

public class FinancialCategory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<FinancialEntry> FinancialEntries { get; set; } = [];
    public ICollection<AccountPayable> AccountsPayable { get; set; } = [];
    public ICollection<AccountReceivable> AccountsReceivable { get; set; } = [];
    public ICollection<Purchase> Purchases { get; set; } = [];
}
