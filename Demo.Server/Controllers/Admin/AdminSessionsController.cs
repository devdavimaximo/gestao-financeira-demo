using Demo.Server.Application.DTOs.Admin;
using Demo.Server.Domain.Constants;
using Demo.Server.Infrastructure.Authorization;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers.Admin;

[ApiController]
[Route("api/admin/sessions")]
[Authorize]
public class AdminSessionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminSessionsController(AppDbContext db) => _db = db;

    // GET /api/admin/sessions
    [HttpGet]
    [RequirePermission(PermissionCodes.Users.View)]
    public async Task<IActionResult> GetActive()
    {
        var sessions = await _db.UserSessions
            .Include(s => s.User)
            .Where(s => !s.IsRevoked && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.LastSeenAt)
            .Select(s => new AdminSessionDto(
                s.Id, s.UserId, s.User.FullName,
                s.IpAddress, s.UserAgent, s.IsRevoked,
                s.LastSeenAt, s.ExpiresAt, s.CreatedAt))
            .ToListAsync();

        return Ok(sessions);
    }

    // DELETE /api/admin/sessions/:id
    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Users.Block)]
    public async Task<IActionResult> Revoke(Guid id)
    {
        var session = await _db.UserSessions.FindAsync(id);
        if (session is null) return NotFound();

        session.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/admin/sessions/user/:userId
    [HttpDelete("user/{userId:guid}")]
    [RequirePermission(PermissionCodes.Users.Block)]
    public async Task<IActionResult> RevokeAllForUser(Guid userId)
    {
        var sessions = await _db.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ToListAsync();

        foreach (var s in sessions) s.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/admin/sessions/all
    [HttpDelete("all")]
    [RequirePermission(PermissionCodes.Users.Block)]
    public async Task<IActionResult> RevokeAll()
    {
        var currentJti = User.FindFirst(
            System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;

        var sessions = await _db.UserSessions
            .Where(s => !s.IsRevoked && s.JwtId != currentJti)
            .ToListAsync();

        foreach (var s in sessions) s.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
