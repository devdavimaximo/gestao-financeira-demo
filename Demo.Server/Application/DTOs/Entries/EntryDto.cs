using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Entries;

public record FinancialEntryDto(
    Guid Id,
    string Description,
    decimal Amount,
    FinancialEntryType Type,
    DateOnly Date,
    string? Notes,
    Guid UnitId,
    string UnitName,
    Guid CategoryId,
    string CategoryName,
    Guid PaymentMethodId,
    string PaymentMethodName,
    Guid? SalesChannelId,
    string? SalesChannelName
);

public record CreateEntryRequest(
    string Description,
    decimal Amount,
    FinancialEntryType Type,
    DateOnly Date,
    string? Notes,
    Guid UnitId,
    Guid CategoryId,
    Guid PaymentMethodId,
    Guid? SalesChannelId
);

public record UpdateEntryRequest(
    string Description,
    decimal Amount,
    FinancialEntryType Type,
    DateOnly Date,
    string? Notes,
    Guid CategoryId,
    Guid PaymentMethodId,
    Guid? SalesChannelId
);
