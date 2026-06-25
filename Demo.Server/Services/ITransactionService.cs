using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public interface ITransactionService
{
    Task<IEnumerable<TransactionDto>> GetAllAsync(int? accountId = null, int? categoryId = null, TransactionType? type = null, DateTime? from = null, DateTime? to = null);
    Task<TransactionDto?> GetByIdAsync(int id);
    Task<TransactionDto> CreateAsync(CreateTransactionDto dto);
    Task<TransactionDto?> UpdateAsync(int id, UpdateTransactionDto dto);
    Task<bool> DeleteAsync(int id);
}
