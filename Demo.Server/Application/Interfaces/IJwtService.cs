using Demo.Server.Domain.Entities;

namespace Demo.Server.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(AppUser user, IList<string> roles, IList<Guid> unitIds);
    DateTime GetExpiration();
}
