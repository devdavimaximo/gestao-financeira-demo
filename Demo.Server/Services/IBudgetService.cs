using Demo.Server.DTOs;

namespace Demo.Server.Services;

public interface IBudgetService
{
    Task<IEnumerable<BudgetDto>> GetAllAsync(int? month = null, int? year = null);
    Task<BudgetDto?> GetByIdAsync(int id);
    Task<BudgetDto> CreateAsync(CreateBudgetDto dto);
    Task<BudgetDto?> UpdateAsync(int id, UpdateBudgetDto dto);
    Task<bool> DeleteAsync(int id);
}
