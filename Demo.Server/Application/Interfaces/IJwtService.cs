using Demo.Server.Domain.Entities;

namespace Demo.Server.Application.Interfaces;

public interface IJwtService
{
    (string Token, string JwtId, DateTime ExpiresAt) GenerateToken(AppUser user, IList<UnitPermissionSet> unitPermissions);
}

public record UnitPermissionSet(Guid UnitId, string UnitName, string RoleName, IList<string> Permissions);
