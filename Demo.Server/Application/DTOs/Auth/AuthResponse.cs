using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Auth;

public record AuthResponse(
    string Token,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    UserStatus Status,
    bool ForcePasswordChange,
    IList<UnitAccessDto> Units,
    DateTime ExpiresAt
);

public record UnitAccessDto(
    Guid UnitId,
    string UnitName,
    string RoleName,
    IList<string> Permissions
);
