namespace Demo.Server.Application.DTOs.Dashboard;

public record DashboardKpiDto(
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal Balance,
    decimal PendingPayables,
    decimal PendingReceivables,
    int UnreadAlerts
);

public record ChartPointDto(string Label, decimal Revenue, decimal Expenses);

public record CategorySummaryDto(string Name, decimal Amount, int Count);

public record DashboardDto(
    DashboardKpiDto Kpis,
    List<ChartPointDto> MonthlyChart,
    List<CategorySummaryDto> TopExpenses,
    List<CategorySummaryDto> TopRevenues
);
