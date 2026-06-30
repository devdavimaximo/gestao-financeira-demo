using Demo.Server.Domain.Entities;

namespace Demo.Server.Application.Interfaces;

public interface IPermissionResolverService
{
    Task<IList<UnitPermissionSet>> ResolveAsync(Guid userId);
}
