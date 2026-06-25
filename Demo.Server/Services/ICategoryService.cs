using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllAsync(CategoryType? type = null);
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<CategoryDto> CreateAsync(CreateCategoryDto dto);
    Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryDto dto);
    Task<bool> DeleteAsync(int id);
}
