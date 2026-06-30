using Demo.Server.Application.Interfaces;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Infrastructure.Identity;

public class PermissionResolverService : IPermissionResolverService
{
    private readonly AppDbContext _db;

    public PermissionResolverService(AppDbContext db) => _db = db;

    public async Task<IList<UnitPermissionSet>> ResolveAsync(Guid userId)
    {
        var userUnits = await _db.UserUnits
            .Where(uu => uu.UserId == userId && uu.IsActive)
            .Include(uu => uu.Unit)
            .Include(uu => uu.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .ToListAsync();

        var overrides = await _db.UserUnitPermissions
            .Where(p => p.UserId == userId)
            .Include(p => p.Permission)
            .ToListAsync();

        var result = new List<UnitPermissionSet>();

        foreach (var uu in userUnits)
        {
            var basePerms = uu.Role.RolePermissions
                .Select(rp => rp.Permission.Code)
                .ToHashSet();

            var unitOverrides = overrides.Where(o => o.UnitId == uu.UnitId);
            foreach (var o in unitOverrides)
            {
                if (o.IsGranted) basePerms.Add(o.Permission.Code);
                else basePerms.Remove(o.Permission.Code);
            }

            result.Add(new UnitPermissionSet(
                uu.UnitId,
                uu.Unit.Name,
                uu.Role.Name,
                basePerms.ToList()
            ));
        }

        return result;
    }
}
