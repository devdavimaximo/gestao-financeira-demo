using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public class TransactionService(IAccountService accountService, ICategoryService categoryService) : ITransactionService
{
    private readonly List<Transaction> _transactions = [
        new() { Id = 1, Description = "Salário Junho", Amount = 5000m, Type = TransactionType.Income, Date = new DateTime(2026, 6, 1), AccountId = 1, CategoryId = 1 },
        new() { Id = 2, Description = "Aluguel", Amount = 1500m, Type = TransactionType.Expense, Date = new DateTime(2026, 6, 5), AccountId = 1, CategoryId = 5 },
        new() { Id = 3, Description = "Supermercado", Amount = 420m, Type = TransactionType.Expense, Date = new DateTime(2026, 6, 10), AccountId = 3, CategoryId = 3 },
        new() { Id = 4, Description = "Freelance Site", Amount = 1200m, Type = TransactionType.Income, Date = new DateTime(2026, 6, 15), AccountId = 1, CategoryId = 2 },
        new() { Id = 5, Description = "Combustível", Amount = 200m, Type = TransactionType.Expense, Date = new DateTime(2026, 6, 18), AccountId = 3, CategoryId = 4 },
    ];
    private int _nextId = 6;

    public async Task<IEnumerable<TransactionDto>> GetAllAsync(int? accountId = null, int? categoryId = null, TransactionType? type = null, DateTime? from = null, DateTime? to = null)
    {
        var accounts = (await accountService.GetAllAsync()).ToDictionary(a => a.Id);
        var categories = (await categoryService.GetAllAsync()).ToDictionary(c => c.Id);

        var query = _transactions.AsEnumerable();
        if (accountId.HasValue) query = query.Where(t => t.AccountId == accountId.Value);
        if (categoryId.HasValue) query = query.Where(t => t.CategoryId == categoryId.Value);
        if (type.HasValue) query = query.Where(t => t.Type == type.Value);
        if (from.HasValue) query = query.Where(t => t.Date >= from.Value);
        if (to.HasValue) query = query.Where(t => t.Date <= to.Value);

        return query.OrderByDescending(t => t.Date).Select(t => ToDto(t, accounts, categories));
    }

    public async Task<TransactionDto?> GetByIdAsync(int id)
    {
        var t = _transactions.FirstOrDefault(t => t.Id == id);
        if (t is null) return null;

        var accounts = (await accountService.GetAllAsync()).ToDictionary(a => a.Id);
        var categories = (await categoryService.GetAllAsync()).ToDictionary(c => c.Id);
        return ToDto(t, accounts, categories);
    }

    public Task<TransactionDto> CreateAsync(CreateTransactionDto dto)
    {
        var transaction = new Transaction
        {
            Id = _nextId++,
            Description = dto.Description,
            Amount = dto.Amount,
            Type = dto.Type,
            Date = dto.Date,
            Notes = dto.Notes,
            AccountId = dto.AccountId,
            CategoryId = dto.CategoryId
        };
        _transactions.Add(transaction);
        return GetByIdAsync(transaction.Id)!;
    }

    public async Task<TransactionDto?> UpdateAsync(int id, UpdateTransactionDto dto)
    {
        var transaction = _transactions.FirstOrDefault(t => t.Id == id);
        if (transaction is null) return null;

        transaction.Description = dto.Description;
        transaction.Amount = dto.Amount;
        transaction.Type = dto.Type;
        transaction.Date = dto.Date;
        transaction.Notes = dto.Notes;
        transaction.AccountId = dto.AccountId;
        transaction.CategoryId = dto.CategoryId;
        transaction.UpdatedAt = DateTime.UtcNow;

        return await GetByIdAsync(id);
    }

    public Task<bool> DeleteAsync(int id)
    {
        var t = _transactions.FirstOrDefault(t => t.Id == id);
        if (t is null) return Task.FromResult(false);
        _transactions.Remove(t);
        return Task.FromResult(true);
    }

    private static TransactionDto ToDto(Transaction t, Dictionary<int, AccountDto> accounts, Dictionary<int, CategoryDto> categories)
    {
        accounts.TryGetValue(t.AccountId, out var account);
        categories.TryGetValue(t.CategoryId, out var category);
        return new TransactionDto(
            t.Id, t.Description, t.Amount, t.Type, t.Date, t.Notes,
            t.AccountId, account?.Name ?? "—",
            t.CategoryId, category?.Name ?? "—", category?.Color ?? "#6366f1",
            t.CreatedAt
        );
    }
}
