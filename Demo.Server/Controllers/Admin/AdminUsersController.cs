using Demo.Server.Application.DTOs.Admin;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Constants;
using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Authorization;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize]
public class AdminUsersController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly IPermissionResolverService _permResolver;
    private readonly ISessionService _session;

    public AdminUsersController(
        UserManager<AppUser> userManager,
        AppDbContext db,
        IAuditService audit,
        IPermissionResolverService permResolver,
        ISessionService session)
    {
        _userManager  = userManager;
        _db           = db;
        _audit        = audit;
        _permResolver = permResolver;
        _session      = session;
    }

    // GET /api/admin/users
    [HttpGet]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] UserStatus? status,
        [FromQuery] Guid? unitId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _userManager.Users
            .Include(u => u.UserUnits).ThenInclude(uu => uu.Unit)
            .Include(u => u.UserUnits).ThenInclude(uu => uu.Role)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                u.FirstName.Contains(search) ||
                u.LastName.Contains(search) ||
                u.Email!.Contains(search) ||
                (u.Position != null && u.Position.Contains(search)));

        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);

        if (unitId.HasValue)
            query = query.Where(u => u.UserUnits.Any(uu => uu.UnitId == unitId.Value));

        var total = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var lastSeen = await _db.UserSessions
            .Where(s => users.Select(u => u.Id).Contains(s.UserId) && !s.IsRevoked)
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, LastSeenAt = g.Max(s => s.LastSeenAt) })
            .ToDictionaryAsync(x => x.UserId, x => (DateTime?)x.LastSeenAt);

        var result = users.Select(u => new AdminUserListItemDto(
            u.Id, u.FirstName, u.LastName, u.FullName, u.Email!,
            u.Phone, u.Position, u.AvatarUrl, u.Status,
            u.ForcePasswordChange, u.CreatedAt,
            lastSeen.TryGetValue(u.Id, out var ls) ? ls : null,
            u.UserUnits.Select(uu => new UserUnitRoleDto(
                uu.UnitId, uu.Unit.Name, uu.RoleId, uu.Role.Name)).ToList()
        )).ToList();

        return Ok(new { total, page, pageSize, data = result });
    }

    // GET /api/admin/users/:id
    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userManager.Users
            .Include(u => u.UserUnits).ThenInclude(uu => uu.Unit)
            .Include(u => u.UserUnits).ThenInclude(uu => uu.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        return Ok(new AdminUserDetailDto(
            user.Id, user.FirstName, user.LastName, user.FullName,
            user.Email!, user.Phone, user.Position, user.AvatarUrl, user.Notes,
            user.Status, user.ForcePasswordChange, user.IsSystemUser, user.CreatedAt,
            user.CreatedByUserId,
            user.UserUnits.Select(uu => new UserUnitRoleDto(
                uu.UnitId, uu.Unit.Name, uu.RoleId, uu.Role.Name)).ToList()
        ));
    }

    // POST /api/admin/users
    [HttpPost]
    [RequirePermission(PermissionCodes.Users.Create)]
    public async Task<IActionResult> Create([FromBody] AdminCreateUserRequest request)
    {
        var actorId = CurrentUserId();

        var user = new AppUser
        {
            Id                  = Guid.NewGuid(),
            FirstName           = request.FirstName,
            LastName            = request.LastName,
            Email               = request.Email,
            UserName            = request.Email,
            Phone               = request.Phone,
            Position            = request.Position,
            AvatarUrl           = request.AvatarUrl,
            Notes               = request.Notes,
            Status              = request.Status,
            ForcePasswordChange = request.ForcePasswordChange,
            CreatedByUserId     = actorId
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        // Batch UserUnits + audit log in one SaveChangesAsync
        _db.UserUnits.AddRange(request.Units.Select(u => new UserUnit
        {
            UserId           = user.Id,
            UnitId           = u.UnitId,
            RoleId           = u.RoleId,
            AssignedByUserId = actorId
        }));
        await _audit.LogAsync("UserCreated", "User", user.Id.ToString(),
            after: new { user.Email, user.FirstName, user.LastName, user.Status },
            actorUserId: actorId,
            ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
            userAgent: Request.Headers.UserAgent.ToString());
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new { id = user.Id });
    }

    // PUT /api/admin/users/:id
    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.Edit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] AdminUpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var before = new { user.FirstName, user.LastName, user.Phone, user.Position };

        user.FirstName = request.FirstName;
        user.LastName  = request.LastName;
        user.Phone     = request.Phone;
        user.Position  = request.Position;
        user.AvatarUrl = request.AvatarUrl;
        user.Notes     = request.Notes;

        await _userManager.UpdateAsync(user);

        await _audit.LogAsync("UserUpdated", "User", id.ToString(),
            before, new { user.FirstName, user.LastName, user.Phone, user.Position },
            CurrentUserId(), HttpContext.Connection.RemoteIpAddress?.ToString());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // DELETE /api/admin/users/:id (hard delete)
    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();
        if (user.IsSystemUser) return Conflict(new { message = "Usuários do sistema não podem ser excluídos." });

        var snapshot = new { user.Email, user.FirstName, user.LastName };
        var actorId  = CurrentUserId();
        var ip       = HttpContext.Connection.RemoteIpAddress?.ToString();

        await _session.RevokeAllForUserAsync(id);

        var delResult = await _userManager.DeleteAsync(user);
        if (!delResult.Succeeded)
            return BadRequest(new { errors = delResult.Errors.Select(e => e.Description) });

        // Audit logged AFTER confirmed delete; actorUserId stays in the log via the nullable FK
        await _audit.LogAsync("UserDeleted", "User", id.ToString(),
            before: snapshot, actorUserId: actorId, ipAddress: ip);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/users/:id/block
    [HttpPost("{id:guid}/block")]
    [RequirePermission(PermissionCodes.Users.Block)]
    public async Task<IActionResult> Block(Guid id, [FromBody] AdminBlockUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();
        if (user.IsSystemUser) return Conflict(new { message = "Usuário do sistema não pode ser bloqueado." });

        var before = user.Status;
        user.Status      = UserStatus.Blocked;
        user.BlockedUntil = null;
        await _userManager.UpdateAsync(user);
        await _session.RevokeAllForUserAsync(id);

        await _audit.LogAsync("UserStatusChanged", "User", id.ToString(),
            new { status = before.ToString() }, new { status = "Blocked", reason = request.Reason },
            CurrentUserId(), HttpContext.Connection.RemoteIpAddress?.ToString());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/users/:id/unblock
    [HttpPost("{id:guid}/unblock")]
    [RequirePermission(PermissionCodes.Users.Block)]
    public async Task<IActionResult> Unblock(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var before = user.Status;
        user.Status       = UserStatus.Active;
        user.BlockedUntil = null;
        await _userManager.UpdateAsync(user);

        await _audit.LogAsync("UserStatusChanged", "User", id.ToString(),
            new { status = before.ToString() }, new { status = "Active" }, CurrentUserId());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/users/:id/suspend
    [HttpPost("{id:guid}/suspend")]
    [RequirePermission(PermissionCodes.Users.Block)]
    public async Task<IActionResult> Suspend(Guid id, [FromBody] AdminSuspendUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var before = user.Status;
        user.Status       = UserStatus.Suspended;
        user.BlockedUntil = request.BlockedUntil.ToUniversalTime();
        await _userManager.UpdateAsync(user);
        await _session.RevokeAllForUserAsync(id);

        await _audit.LogAsync("UserStatusChanged", "User", id.ToString(),
            new { status = before.ToString() },
            new { status = "Suspended", until = request.BlockedUntil, reason = request.Reason },
            CurrentUserId());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/users/:id/activate
    [HttpPost("{id:guid}/activate")]
    [RequirePermission(PermissionCodes.Users.Edit)]
    public async Task<IActionResult> Activate(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var before = user.Status;
        user.Status = UserStatus.Active;
        await _userManager.UpdateAsync(user);

        await _audit.LogAsync("UserStatusChanged", "User", id.ToString(),
            new { status = before.ToString() }, new { status = "Active" }, CurrentUserId());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/users/:id/deactivate
    [HttpPost("{id:guid}/deactivate")]
    [RequirePermission(PermissionCodes.Users.Edit)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var before = user.Status;
        user.Status = UserStatus.Deactivated;
        await _userManager.UpdateAsync(user);
        await _session.RevokeAllForUserAsync(id);

        await _audit.LogAsync("UserStatusChanged", "User", id.ToString(),
            new { status = before.ToString() }, new { status = "Deactivated" }, CurrentUserId());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/admin/users/:id/reset-password
    [HttpPost("{id:guid}/reset-password")]
    [RequirePermission(PermissionCodes.Users.ResetPassword)]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] AdminResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var token  = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        user.ForcePasswordChange = true;
        await _userManager.UpdateAsync(user);
        await _session.RevokeAllForUserAsync(id);

        await _audit.LogAsync("UserPasswordReset", "User", id.ToString(),
            actorUserId: CurrentUserId(),
            ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PUT /api/admin/users/:id/units
    [HttpPut("{id:guid}/units")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> UpdateUnits(Guid id, [FromBody] AdminUpdateUserUnitsRequest request)
    {
        var user = await _userManager.Users.Include(u => u.UserUnits).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        var before = user.UserUnits.Select(uu => new { uu.UnitId, uu.RoleId }).ToList();

        // Batch unit changes + audit in one transaction
        _db.UserUnits.RemoveRange(user.UserUnits);
        _db.UserUnits.AddRange(request.Units.Select(u => new UserUnit
        {
            UserId = id, UnitId = u.UnitId, RoleId = u.RoleId, AssignedByUserId = CurrentUserId()
        }));
        await _audit.LogAsync("UserUnitsUpdated", "User", id.ToString(),
            before, request.Units, CurrentUserId());
        await _db.SaveChangesAsync();

        await _session.RevokeAllForUserAsync(id);

        return NoContent();
    }

    // GET /api/admin/users/:id/permissions/:unitId
    [HttpGet("{id:guid}/permissions/{unitId:guid}")]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetPermissions(Guid id, Guid unitId)
    {
        var userUnit = await _db.UserUnits
            .Include(uu => uu.Unit)
            .Include(uu => uu.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(uu => uu.UserId == id && uu.UnitId == unitId);

        if (userUnit is null) return NotFound();

        var overrides = await _db.UserUnitPermissions
            .Include(p => p.Permission)
            .Where(p => p.UserId == id && p.UnitId == unitId)
            .ToListAsync();

        return Ok(new AdminUserPermissionsDto(
            unitId, userUnit.Unit.Name, userUnit.Role.Name,
            userUnit.Role.RolePermissions.Select(rp => rp.Permission.Code).ToList(),
            overrides.Select(o => new PermissionOverrideDto(
                o.PermissionId, o.Permission.Code, o.Permission.Name, o.IsGranted)).ToList()
        ));
    }

    // PUT /api/admin/users/:id/permissions/:unitId
    [HttpPut("{id:guid}/permissions/{unitId:guid}")]
    [RequirePermission(PermissionCodes.Users.ManagePermissions)]
    public async Task<IActionResult> UpdatePermissions(
        Guid id, Guid unitId, [FromBody] AdminUpdatePermissionsRequest request)
    {
        var existing = await _db.UserUnitPermissions
            .Where(p => p.UserId == id && p.UnitId == unitId)
            .ToListAsync();

        // Batch permission changes + audit in one transaction
        _db.UserUnitPermissions.RemoveRange(existing);
        _db.UserUnitPermissions.AddRange(request.Overrides.Select(o => new UserUnitPermission
        {
            UserId          = id,
            UnitId          = unitId,
            PermissionId    = o.PermissionId,
            IsGranted       = o.IsGranted,
            GrantedByUserId = CurrentUserId()
        }));
        await _audit.LogAsync("PermissionOverridesUpdated", "UserUnitPermission",
            $"{id}/{unitId}", actorUserId: CurrentUserId());
        await _db.SaveChangesAsync();

        await _session.RevokeAllForUserAsync(id);

        return NoContent();
    }

    // GET /api/admin/users/:id/timeline
    [HttpGet("{id:guid}/timeline")]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetTimeline(Guid id, [FromQuery] int limit = 50)
    {
        var events = await _db.AuditLogs
            .Include(a => a.ActorUser)
            .Where(a => a.EntityId == id.ToString() || a.ActorUserId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new UserTimelineEventDto(
                a.Id, a.Action,
                a.ActorUser != null ? a.ActorUser.FullName : null,
                a.EntityId, a.After, a.IpAddress, a.CreatedAt))
            .ToListAsync();

        return Ok(events);
    }

    // GET /api/admin/users/:id/sessions
    [HttpGet("{id:guid}/sessions")]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetSessions(Guid id)
    {
        var sessions = await _db.UserSessions
            .Where(s => s.UserId == id)
            .OrderByDescending(s => s.LastSeenAt)
            .Select(s => new AdminSessionDto(
                s.Id, s.UserId, string.Empty,
                s.IpAddress, s.UserAgent, s.IsRevoked,
                s.LastSeenAt, s.ExpiresAt, s.CreatedAt))
            .ToListAsync();

        return Ok(sessions);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Guid? CurrentUserId()
    {
        var sub = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return sub is null ? null : Guid.Parse(sub);
    }
}
