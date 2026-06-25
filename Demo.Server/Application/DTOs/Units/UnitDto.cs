using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Units;

public record UnitDto(Guid Id, string Name, string Identifier, UnitStatus Status, DateTime CreatedAt);

public record CreateUnitRequest(string Name, string Identifier);

public record UpdateUnitRequest(string Name, string Identifier, UnitStatus Status);
