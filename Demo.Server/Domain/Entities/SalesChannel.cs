namespace Demo.Server.Domain.Entities;

public class SalesChannel
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<FinancialEntry> FinancialEntries { get; set; } = [];
}
