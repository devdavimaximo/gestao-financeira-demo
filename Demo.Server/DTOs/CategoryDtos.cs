using Demo.Server.Models;

namespace Demo.Server.DTOs;

public record CategoryDto(
    int Id,
    string Name,
    string? Description,
    string Color,
    string Icon,
    CategoryType Type,
    DateTime CreatedAt
);

public record CreateCategoryDto(
    string Name,
    string? Description,
    string Color,
    string Icon,
    CategoryType Type
);

public record UpdateCategoryDto(
    string Name,
    string? Description,
    string Color,
    string Icon,
    CategoryType Type
);
