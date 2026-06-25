using Demo.Server.Models;

namespace Demo.Server.DTOs;

public record TransactionDto(
    int Id,
    string Description,
    decimal Amount,
    TransactionType Type,
    DateTime Date,
    string? Notes,
    int AccountId,
    string AccountName,
    int CategoryId,
    string CategoryName,
    string CategoryColor,
    DateTime CreatedAt
);

public record CreateTransactionDto(
    string Description,
    decimal Amount,
    TransactionType Type,
    DateTime Date,
    string? Notes,
    int AccountId,
    int CategoryId
);

public record UpdateTransactionDto(
    string Description,
    decimal Amount,
    TransactionType Type,
    DateTime Date,
    string? Notes,
    int AccountId,
    int CategoryId
);
