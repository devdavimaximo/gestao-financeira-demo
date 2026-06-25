namespace Demo.Server.DTOs;

public record DashboardSummaryDto(
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal NetBalance,
    decimal TotalAssets,
    IEnumerable<MonthlyChartDto> MonthlyChart,
    IEnumerable<CategoryExpenseDto> TopExpenseCategories,
    IEnumerable<TransactionDto> RecentTransactions
);

public record MonthlyChartDto(
    int Month,
    int Year,
    string Label,
    decimal Income,
    decimal Expenses
);

public record CategoryExpenseDto(
    string CategoryName,
    string Color,
    decimal Amount,
    decimal Percentage
);
