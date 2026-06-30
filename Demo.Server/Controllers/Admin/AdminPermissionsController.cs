using Demo.Server.Application.DTOs.Admin;
using Demo.Server.Domain.Constants;
using Demo.Server.Infrastructure.Authorization;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers.Admin;

[ApiController]
[Route("api/admin/permissions")]
[Authorize]
public class AdminPermissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminPermissionsController(AppDbContext db) => _db = db;

    // GET /api/admin/permissions/modules
    [HttpGet("modules")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> GetModules()
    {
        var modules = await _db.Modules
            .Include(m => m.Permissions.OrderBy(p => p.DisplayOrder))
            .Where(m => m.IsActive)
            .OrderBy(m => m.DisplayOrder)
            .Select(m => new AdminModuleDto(
                m.Id, m.Code, m.Name, m.Icon, m.DisplayOrder,
                m.Permissions.Select(p => new AdminPermissionDto(
                    p.Id, p.Code, p.Name, p.DisplayOrder)).ToList()))
            .ToListAsync();

        return Ok(modules);
    }
}
