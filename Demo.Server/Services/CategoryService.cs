using Demo.Server.DTOs;
using Demo.Server.Models;

namespace Demo.Server.Services;

public class CategoryService : ICategoryService
{
    private readonly List<Category> _categories = [
        new() { Id = 1, Name = "Salário", Color = "#22c55e", Icon = "briefcase", Type = CategoryType.Income },
        new() { Id = 2, Name = "Freelance", Color = "#3b82f6", Icon = "laptop", Type = CategoryType.Income },
        new() { Id = 3, Name = "Alimentação", Color = "#f97316", Icon = "utensils", Type = CategoryType.Expense },
        new() { Id = 4, Name = "Transporte", Color = "#8b5cf6", Icon = "car", Type = CategoryType.Expense },
        new() { Id = 5, Name = "Moradia", Color = "#ef4444", Icon = "home", Type = CategoryType.Expense },
        new() { Id = 6, Name = "Saúde", Color = "#06b6d4", Icon = "heart", Type = CategoryType.Expense },
        new() { Id = 7, Name = "Lazer", Color = "#f59e0b", Icon = "smile", Type = CategoryType.Expense },
        new() { Id = 8, Name = "Educação", Color = "#6366f1", Icon = "book", Type = CategoryType.Expense },
    ];
    private int _nextId = 9;

    public Task<IEnumerable<CategoryDto>> GetAllAsync(CategoryType? type = null)
    {
        var query = _categories.AsEnumerable();
        if (type.HasValue)
            query = query.Where(c => c.Type == type.Value || c.Type == CategoryType.Both);
        return Task.FromResult(query.Select(ToDto));
    }

    public Task<CategoryDto?> GetByIdAsync(int id) =>
        Task.FromResult(_categories.FirstOrDefault(c => c.Id == id) is { } cat ? ToDto(cat) : (CategoryDto?)null);

    public Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
    {
        var category = new Category
        {
            Id = _nextId++,
            Name = dto.Name,
            Description = dto.Description,
            Color = dto.Color,
            Icon = dto.Icon,
            Type = dto.Type
        };
        _categories.Add(category);
        return Task.FromResult(ToDto(category));
    }

    public Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryDto dto)
    {
        var category = _categories.FirstOrDefault(c => c.Id == id);
        if (category is null) return Task.FromResult<CategoryDto?>(null);

        category.Name = dto.Name;
        category.Description = dto.Description;
        category.Color = dto.Color;
        category.Icon = dto.Icon;
        category.Type = dto.Type;

        return Task.FromResult<CategoryDto?>(ToDto(category));
    }

    public Task<bool> DeleteAsync(int id)
    {
        var category = _categories.FirstOrDefault(c => c.Id == id);
        if (category is null) return Task.FromResult(false);
        _categories.Remove(category);
        return Task.FromResult(true);
    }

    private static CategoryDto ToDto(Category c) =>
        new(c.Id, c.Name, c.Description, c.Color, c.Icon, c.Type, c.CreatedAt);
}
