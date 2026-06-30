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
    string? SalesChannelName,
    Guid? ParentEntryId,
    RecurrenceType? RecurrenceFrequency,
    int? RecurrenceInterval,
    DateOnly? RecurrenceEndDate
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
    Guid? SalesChannelId,
    bool IsRecurring = false,
    RecurrenceType? RecurrenceFrequency = null,
    int? RecurrenceInterval = null,
    DateOnly? RecurrenceEndDate = null
);

public record UpdateEntryRequest(
    string Description,
    decimal Amount,
    FinancialEntryType Type,
    DateOnly Date,
    string? Notes,
    Guid CategoryId,
    Guid PaymentMethodId,
    Guid? SalesChannelId,
    string Scope = "single"
);
