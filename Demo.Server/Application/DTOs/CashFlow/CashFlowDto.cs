namespace Demo.Server.Application.DTOs.CashFlow;

public record CashFlowPointDto(
    string Label,
    string Date,
    decimal Revenue,
    decimal Expenses,
    decimal Balance,
    decimal RunningBalance
);

public record CashFlowDto(
    List<CashFlowPointDto> Points,
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetBalance
);
