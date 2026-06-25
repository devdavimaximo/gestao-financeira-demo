using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public class AccountService : IAccountService
{
    private readonly List<Account> _accounts = [
        new() { Id = 1, Name = "Conta Corrente", Type = AccountType.Checking, Balance = 3500.00m, Currency = "BRL" },
        new() { Id = 2, Name = "Poupança", Type = AccountType.Savings, Balance = 12000.00m, Currency = "BRL" },
        new() { Id = 3, Name = "Cartão de Crédito", Type = AccountType.CreditCard, Balance = -850.00m, Currency = "BRL" },
    ];
    private int _nextId = 4;

    public Task<IEnumerable<AccountDto>> GetAllAsync(bool activeOnly = false)
    {
        var query = _accounts.AsEnumerable();
        if (activeOnly) query = query.Where(a => a.IsActive);
        return Task.FromResult(query.Select(ToDto));
    }

    public Task<AccountDto?> GetByIdAsync(int id) =>
        Task.FromResult(_accounts.FirstOrDefault(a => a.Id == id) is { } acc ? ToDto(acc) : (AccountDto?)null);

    public Task<AccountDto> CreateAsync(CreateAccountDto dto)
    {
        var account = new Account
        {
            Id = _nextId++,
            Name = dto.Name,
            Type = dto.Type,
            Balance = dto.InitialBalance,
            Currency = dto.Currency,
            Description = dto.Description
        };
        _accounts.Add(account);
        return Task.FromResult(ToDto(account));
    }

    public Task<AccountDto?> UpdateAsync(int id, UpdateAccountDto dto)
    {
        var account = _accounts.FirstOrDefault(a => a.Id == id);
        if (account is null) return Task.FromResult<AccountDto?>(null);

        account.Name = dto.Name;
        account.Type = dto.Type;
        account.Currency = dto.Currency;
        account.Description = dto.Description;
        account.IsActive = dto.IsActive;

        return Task.FromResult<AccountDto?>(ToDto(account));
    }

    public Task<bool> DeleteAsync(int id)
    {
        var account = _accounts.FirstOrDefault(a => a.Id == id);
        if (account is null) return Task.FromResult(false);
        _accounts.Remove(account);
        return Task.FromResult(true);
    }

    private static AccountDto ToDto(Account a) =>
        new(a.Id, a.Name, a.Type, a.Balance, a.Currency, a.Description, a.IsActive, a.CreatedAt);
}
