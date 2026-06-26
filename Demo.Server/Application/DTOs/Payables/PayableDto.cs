using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Payables;

public record AccountPayableDto(
    Guid Id,
    string Description,
    decimal Amount,
    DateOnly DueDate,
    DateOnly? PaidDate,
    decimal? PaidAmount,
    AccountPayableStatus Status,
    string? Notes,
    Guid UnitId,
    string UnitName,
    Guid CategoryId,
    string CategoryName,
    Guid? PaymentMethodId,
    string? PaymentMethodName
);

public record CreatePayableRequest(
    string Description,
    decimal Amount,
    DateOnly DueDate,
    string? Notes,
    Guid UnitId,
    Guid CategoryId,
    Guid? PaymentMethodId
);

public record UpdatePayableRequest(
    string Description,
    decimal Amount,
    DateOnly DueDate,
    string? Notes,
    Guid CategoryId,
    Guid? PaymentMethodId
);

public record PayPayableRequest(
    decimal PaidAmount,
    DateOnly PaidDate,
    Guid PaymentMethodId
);
