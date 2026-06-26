using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Budgets;

public record BudgetDto(
    Guid Id,
    string Description,
    decimal TotalAmount,
    decimal UsedAmount,
    decimal AvailableAmount,
    int Month,
    int Year,
    BudgetStatus Status,
    Guid UnitId,
    string UnitName
);

public record CreateBudgetRequest(
    string Description,
    decimal TotalAmount,
    int Month,
    int Year,
    Guid UnitId
);

public record UpdateBudgetRequest(
    string Description,
    decimal TotalAmount
);
