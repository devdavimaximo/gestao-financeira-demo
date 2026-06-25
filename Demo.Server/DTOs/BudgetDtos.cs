using Demo.Server.Models;

namespace Demo.Server.DTOs;

public record BudgetDto(
    int Id,
    string Name,
    decimal LimitAmount,
    decimal SpentAmount,
    int Month,
    int Year,
    BudgetStatus Status,
    int CategoryId,
    string CategoryName,
    string CategoryColor,
    DateTime CreatedAt
);

public record CreateBudgetDto(
    string Name,
    decimal LimitAmount,
    int Month,
    int Year,
    int CategoryId
);

public record UpdateBudgetDto(
    string Name,
    decimal LimitAmount,
    BudgetStatus Status
);
