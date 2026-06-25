using Demo.Server.DTOs;

namespace Demo.Server.Services;

public interface IAccountService
{
    Task<IEnumerable<AccountDto>> GetAllAsync(bool activeOnly = false);
    Task<AccountDto?> GetByIdAsync(int id);
    Task<AccountDto> CreateAsync(CreateAccountDto dto);
    Task<AccountDto?> UpdateAsync(int id, UpdateAccountDto dto);
    Task<bool> DeleteAsync(int id);
}
