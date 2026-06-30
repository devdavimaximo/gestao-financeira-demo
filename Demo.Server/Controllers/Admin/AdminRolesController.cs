using Demo.Server.Application.DTOs.Admin;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Constants;
using Demo.Server.Domain.Entities;
using Demo.Server.Infrastructure.Authorization;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers.Admin;

[ApiController]
[Route("api/admin/roles")]
[Authorize]
public class AdminRolesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public AdminRolesController(AppDbContext db, IAuditService audit)
    {
        _db    = db;
        _audit = audit;
    }

    // GET /api/admin/roles
    [HttpGet]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.Roles
            .Include(r => r.UserUnits)
            .OrderByDescending(r => r.IsSystem)
            .ThenBy(r => r.Name)
            .Select(r => new AdminRoleListItemDto(
                r.Id, r.Name, r.Description, r.IsSystem, r.IsActive,
                r.UserUnits.Count, r.CreatedAt))
            .ToListAsync();

        return Ok(roles);
    }

    // GET /api/admin/roles/:id
    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var role = await _db.Roles
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role is null) return NotFound();

        return Ok(new AdminRoleDetailDto(
            role.Id, role.Name, role.Description, role.IsSystem, role.IsActive,
            role.RolePermissions.Select(rp => rp.Permission.Code).ToList()
        ));
    }

    // POST /api/admin/roles
    [HttpPost]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> Create([FromBody] AdminCreateRoleRequest request)
    {
        if (await _db.Roles.AnyAsync(r => r.Name == request.Name))
            return Conflict(new { message = "Já existe uma role com esse nome." });

        var permissions = await _db.Permissions
            .Where(p => request.PermissionCodes.Contains(p.Code))
            .ToListAsync();

        var role = new Role
        {
            Id              = Guid.NewGuid(),
            Name            = request.Name,
            Description     = request.Description,
            IsSystem        = false,
            CreatedByUserId = CurrentUserId()
        };

        role.RolePermissions = permissions
            .Select(p => new RolePermission { RoleId = role.Id, PermissionId = p.Id })
            .ToList();

        // Batch: role + audit in one transaction
        _db.Roles.Add(role);
        await _audit.LogAsync("RoleCreated", "Role", role.Id.ToString(),
            after: new { role.Name, permissions = request.PermissionCodes },
            actorUserId: CurrentUserId());
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = role.Id }, new { id = role.Id });
    }

    // PUT /api/admin/roles/:id
    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> Update(Guid id, [FromBody] AdminUpdateRoleRequest request)
    {
        var role = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role is null) return NotFound();
        if (role.IsSystem && request.Name != role.Name)
            return Conflict(new { message = "Roles do sistema não podem ser renomeadas." });

        var before = new { role.Name, role.IsActive, permissions = role.RolePermissions.Select(rp => rp.PermissionId) };

        var permissions = await _db.Permissions
            .Where(p => request.PermissionCodes.Contains(p.Code))
            .ToListAsync();

        role.Name        = request.Name;
        role.Description = request.Description;
        role.IsActive    = request.IsActive;

        _db.RolePermissions.RemoveRange(role.RolePermissions);
        _db.RolePermissions.AddRange(permissions
            .Select(p => new RolePermission { RoleId = role.Id, PermissionId = p.Id }));

        // Revoke sessions of all users with this role so they get a refreshed JWT
        var affectedUserIds = await _db.UserUnits
            .Where(uu => uu.RoleId == id)
            .Select(uu => uu.UserId)
            .Distinct()
            .ToListAsync();

        var sessions = await _db.UserSessions
            .Where(s => affectedUserIds.Contains(s.UserId) && !s.IsRevoked)
            .ToListAsync();
        foreach (var s in sessions) s.IsRevoked = true;

        // Batch: role changes + session revocations + audit in one transaction
        await _audit.LogAsync("RoleUpdated", "Role", id.ToString(),
            before, new { role.Name, role.IsActive, permissions = request.PermissionCodes },
            CurrentUserId());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // DELETE /api/admin/roles/:id
    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var role = await _db.Roles.Include(r => r.UserUnits).FirstOrDefaultAsync(r => r.Id == id);
        if (role is null) return NotFound();
        if (role.UserUnits.Count > 0)
            return Conflict(new { message = $"O cargo está em uso por {role.UserUnits.Count} usuário(s). Reatribua-os antes de excluir." });

        var snapshot = new { role.Name };

        // Revoke any lingering sessions that carry this role's permissions
        var affectedUserIds = await _db.UserUnits
            .Where(uu => uu.RoleId == id)
            .Select(uu => uu.UserId)
            .Distinct()
            .ToListAsync();

        if (affectedUserIds.Count > 0)
        {
            var sessions = await _db.UserSessions
                .Where(s => affectedUserIds.Contains(s.UserId) && !s.IsRevoked)
                .ToListAsync();
            foreach (var s in sessions) s.IsRevoked = true;
        }

        // Delete FIRST, then audit (so audit confirms the delete succeeded)
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("RoleDeleted", "Role", id.ToString(),
            before: snapshot, actorUserId: CurrentUserId());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/roles/:id/duplicate
    [HttpPost("{id:guid}/duplicate")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> Duplicate(Guid id)
    {
        var source = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (source is null) return NotFound();

        var copy = new Role
        {
            Id              = Guid.NewGuid(),
            Name            = $"{source.Name} (cópia)",
            Description     = source.Description,
            IsSystem        = false,
            CreatedByUserId = CurrentUserId()
        };

        copy.RolePermissions = source.RolePermissions
            .Select(rp => new RolePermission { RoleId = copy.Id, PermissionId = rp.PermissionId })
            .ToList();

        // Batch: new role + audit in one transaction
        _db.Roles.Add(copy);
        await _audit.LogAsync("RoleDuplicated", "Role", copy.Id.ToString(),
            after: new { copy.Name, sourceId = id }, actorUserId: CurrentUserId());
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = copy.Id }, new { id = copy.Id });
    }

    private Guid? CurrentUserId()
    {
        var sub = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return sub is null ? null : Guid.Parse(sub);
    }
}
