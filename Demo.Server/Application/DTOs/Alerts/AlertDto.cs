using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Alerts;

public record AlertDto(
    Guid Id,
    AlertType Type,
    string Message,
    bool IsRead,
    string? ReferenceId,
    DateTime CreatedAt,
    Guid UnitId,
    string UnitName
);
