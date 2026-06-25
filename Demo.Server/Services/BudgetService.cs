using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public class BudgetService(ICategoryService categoryService, ITransactionService transactionService) : IBudgetService
{
    private readonly List<Budget> _budgets = [
        new() { Id = 1, Name = "Alimentação Junho", LimitAmount = 600m, Month = 6, Year = 2026, CategoryId = 3 },
        new() { Id = 2, Name = "Transporte Junho", LimitAmount = 400m, Month = 6, Year = 2026, CategoryId = 4 },
        new() { Id = 3, Name = "Lazer Junho", LimitAmount = 300m, Month = 6, Year = 2026, CategoryId = 7 },
    ];
    private int _nextId = 4;

    public async Task<IEnumerable<BudgetDto>> GetAllAsync(int? month = null, int? year = null)
    {
        var query = _budgets.AsEnumerable();
        if (month.HasValue) query = query.Where(b => b.Month == month.Value);
        if (year.HasValue) query = query.Where(b => b.Year == year.Value);

        var categories = (await categoryService.GetAllAsync()).ToDictionary(c => c.Id);
        var dtos = new List<BudgetDto>();
        foreach (var b in query)
        {
            var spent = await GetSpentAmountAsync(b.CategoryId, b.Month, b.Year);
            categories.TryGetValue(b.CategoryId, out var cat);
            dtos.Add(new BudgetDto(b.Id, b.Name, b.LimitAmount, spent, b.Month, b.Year, b.Status, b.CategoryId, cat?.Name ?? "—", cat?.Color ?? "#6366f1", b.CreatedAt));
        }
        return dtos;
    }

    public async Task<BudgetDto?> GetByIdAsync(int id)
    {
        var b = _budgets.FirstOrDefault(b => b.Id == id);
        if (b is null) return null;

        var categories = (await categoryService.GetAllAsync()).ToDictionary(c => c.Id);
        var spent = await GetSpentAmountAsync(b.CategoryId, b.Month, b.Year);
        categories.TryGetValue(b.CategoryId, out var cat);
        return new BudgetDto(b.Id, b.Name, b.LimitAmount, spent, b.Month, b.Year, b.Status, b.CategoryId, cat?.Name ?? "—", cat?.Color ?? "#6366f1", b.CreatedAt);
    }

    public async Task<BudgetDto> CreateAsync(CreateBudgetDto dto)
    {
        var budget = new Budget
        {
            Id = _nextId++,
            Name = dto.Name,
            LimitAmount = dto.LimitAmount,
            Month = dto.Month,
            Year = dto.Year,
            CategoryId = dto.CategoryId
        };
        _budgets.Add(budget);
        return (await GetByIdAsync(budget.Id))!;
    }

    public async Task<BudgetDto?> UpdateAsync(int id, UpdateBudgetDto dto)
    {
        var budget = _budgets.FirstOrDefault(b => b.Id == id);
        if (budget is null) return null;

        budget.Name = dto.Name;
        budget.LimitAmount = dto.LimitAmount;
        budget.Status = dto.Status;

        return await GetByIdAsync(id);
    }

    public Task<bool> DeleteAsync(int id)
    {
        var b = _budgets.FirstOrDefault(b => b.Id == id);
        if (b is null) return Task.FromResult(false);
        _budgets.Remove(b);
        return Task.FromResult(true);
    }

    private async Task<decimal> GetSpentAmountAsync(int categoryId, int month, int year)
    {
        var from = new DateTime(year, month, 1);
        var to = from.AddMonths(1).AddDays(-1);
        var transactions = await transactionService.GetAllAsync(categoryId: categoryId, type: Models.TransactionType.Expense, from: from, to: to);
        return transactions.Sum(t => t.Amount);
    }
}
