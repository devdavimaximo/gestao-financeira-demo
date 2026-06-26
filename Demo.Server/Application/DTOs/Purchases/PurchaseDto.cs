using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Purchases;

public record PurchaseDto(
    Guid Id,
    string Description,
    decimal Amount,
    DateOnly? DueDate,
    PurchaseStatus Status,
    string? Notes,
    Guid UnitId,
    string UnitName,
    Guid BudgetId,
    string BudgetDescription,
    Guid CategoryId,
    string CategoryName
);

public record CreatePurchaseRequest(
    string Description,
    decimal Amount,
    DateOnly? DueDate,
    string? Notes,
    Guid UnitId,
    Guid CategoryId,
    Guid BudgetId
);

public record UpdatePurchaseRequest(
    string Description,
    decimal Amount,
    DateOnly? DueDate,
    string? Notes,
    Guid CategoryId,
    PurchaseStatus Status
);
