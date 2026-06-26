using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Receivables;

public record AccountReceivableDto(
    Guid Id,
    string Description,
    decimal ExpectedAmount,
    decimal? ReceivedAmount,
    DateOnly ExpectedDate,
    DateOnly? ReceivedDate,
    AccountReceivableStatus Status,
    string? Notes,
    Guid UnitId,
    string UnitName,
    Guid CategoryId,
    string CategoryName,
    Guid? PaymentMethodId,
    string? PaymentMethodName
);

public record CreateReceivableRequest(
    string Description,
    decimal ExpectedAmount,
    DateOnly ExpectedDate,
    string? Notes,
    Guid UnitId,
    Guid CategoryId,
    Guid? PaymentMethodId
);

public record ReceiveRequest(
    decimal ReceivedAmount,
    DateOnly ReceivedDate
);
