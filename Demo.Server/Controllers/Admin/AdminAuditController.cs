using Demo.Server.Application.DTOs.Admin;
using Demo.Server.Domain.Constants;
using Demo.Server.Infrastructure.Authorization;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers.Admin;

[ApiController]
[Route("api/admin/audit")]
[Authorize]
public class AdminAuditController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminAuditController(AppDbContext db) => _db = db;

    // GET /api/admin/audit
    [HttpGet]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] Guid? actorUserId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.AuditLogs
            .Include(a => a.ActorUser)
            .AsQueryable();

        if (!string.IsNullOrEmpty(action))     query = query.Where(a => a.Action == action);
        if (!string.IsNullOrEmpty(entityType)) query = query.Where(a => a.EntityType == entityType);
        if (actorUserId.HasValue)              query = query.Where(a => a.ActorUserId == actorUserId);
        if (from.HasValue)                     query = query.Where(a => a.CreatedAt >= from.Value.ToUniversalTime());
        if (to.HasValue)                       query = query.Where(a => a.CreatedAt <= to.Value.ToUniversalTime());

        var total = await query.CountAsync();
        var logs  = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AdminAuditLogDto(
                a.Id, a.ActorUserId,
                a.ActorUser != null ? a.ActorUser.FullName : null,
                a.Action, a.EntityType, a.EntityId,
                a.Before, a.After, a.IpAddress, a.UserAgent, a.CreatedAt))
            .ToListAsync();

        return Ok(new { total, page, pageSize, data = logs });
    }

    // GET /api/admin/audit/user/:userId
    [HttpGet("user/{userId:guid}")]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetByUser(Guid userId, [FromQuery] int limit = 100)
    {
        var logs = await _db.AuditLogs
            .Include(a => a.ActorUser)
            .Where(a => a.EntityId == userId.ToString() || a.ActorUserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new AdminAuditLogDto(
                a.Id, a.ActorUserId,
                a.ActorUser != null ? a.ActorUser.FullName : null,
                a.Action, a.EntityType, a.EntityId,
                a.Before, a.After, a.IpAddress, a.UserAgent, a.CreatedAt))
            .ToListAsync();

        return Ok(logs);
    }
}
