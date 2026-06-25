using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public class DashboardService(ITransactionService transactionService, IAccountService accountService) : IDashboardService
{
    public async Task<DashboardSummaryDto> GetSummaryAsync(int? month = null, int? year = null)
    {
        var now = DateTime.Now;
        var targetMonth = month ?? now.Month;
        var targetYear = year ?? now.Year;

        var from = new DateTime(targetYear, targetMonth, 1);
        var to = from.AddMonths(1).AddDays(-1);

        var transactions = (await transactionService.GetAllAsync(from: from, to: to)).ToList();

        var totalIncome = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalExpenses = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

        var accounts = await accountService.GetAllAsync(activeOnly: true);
        var totalAssets = accounts.Sum(a => a.Balance);

        var monthlyChart = await GetMonthlyChartAsync(targetYear);

        var topCategories = transactions
            .Where(t => t.Type == TransactionType.Expense)
            .GroupBy(t => new { t.CategoryId, t.CategoryName, t.CategoryColor })
            .Select(g => new CategoryExpenseDto(g.Key.CategoryName, g.Key.CategoryColor, g.Sum(t => t.Amount), 0))
            .OrderByDescending(c => c.Amount)
            .Take(5)
            .ToList();

        if (totalExpenses > 0)
            topCategories = topCategories.Select(c => c with { Percentage = Math.Round(c.Amount / totalExpenses * 100, 1) }).ToList();

        var recent = transactions.Take(5);

        return new DashboardSummaryDto(totalIncome, totalExpenses, totalIncome - totalExpenses, totalAssets, monthlyChart, topCategories, recent);
    }

    private async Task<IEnumerable<MonthlyChartDto>> GetMonthlyChartAsync(int year)
    {
        var months = new List<MonthlyChartDto>();
        var monthNames = new[] { "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez" };

        for (int m = 1; m <= 12; m++)
        {
            var from = new DateTime(year, m, 1);
            var to = from.AddMonths(1).AddDays(-1);
            var txs = (await transactionService.GetAllAsync(from: from, to: to)).ToList();

            months.Add(new MonthlyChartDto(
                m, year, monthNames[m - 1],
                txs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                txs.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
            ));
        }

        return months;
    }
}
