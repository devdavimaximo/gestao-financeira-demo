using Demo.Server.Models;

namespace Demo.Server.DTOs;

public record AccountDto(
    int Id,
    string Name,
    AccountType Type,
    decimal Balance,
    string Currency,
    string? Description,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateAccountDto(
    string Name,
    AccountType Type,
    decimal InitialBalance,
    string Currency,
    string? Description
);

public record UpdateAccountDto(
    string Name,
    AccountType Type,
    string Currency,
    string? Description,
    bool IsActive
);
