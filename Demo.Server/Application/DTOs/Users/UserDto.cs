namespace Demo.Server.Application.DTOs.Users;

public record UserDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    IList<Guid> UnitIds,
    DateTime CreatedAt
);

public record CreateUserRequest(
    string FullName,
    string Email,
    string Password,
    string Role,
    IList<Guid> UnitIds
);

public record UpdateUserRequest(
    string FullName,
    string Role,
    bool IsActive,
    IList<Guid> UnitIds
);
