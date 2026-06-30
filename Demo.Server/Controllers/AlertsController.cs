using Demo.Server.Application.DTOs.Alerts;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/alerts")]
[Authorize]
public class AlertsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? unitId, [FromQuery] bool? isRead)
    {
        var q = db.Alerts.AsQueryable();

        if (Guid.TryParse(unitId, out var uid))
            q = q.Where(a => a.UnitId == uid);

        if (isRead.HasValue)
            q = q.Where(a => a.IsRead == isRead.Value);

        var alerts = await q
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AlertDto(
                a.Id, a.Type, a.Message, a.IsRead,
                a.ReferenceId, a.CreatedAt, a.UnitId, a.Unit.Name, a.DueDate))
            .ToListAsync();

        return Ok(alerts);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount([FromQuery] string? unitId)
    {
        var q = db.Alerts.Where(a => !a.IsRead);
        if (Guid.TryParse(unitId, out var uid))
            q = q.Where(a => a.UnitId == uid);
        return Ok(new { count = await q.CountAsync() });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var alert = await db.Alerts.FindAsync(id);
        if (alert is null) return NotFound();
        alert.IsRead = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/unread")]
    public async Task<IActionResult> MarkUnread(Guid id)
    {
        var alert = await db.Alerts.FindAsync(id);
        if (alert is null) return NotFound();
        alert.IsRead = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead([FromQuery] string? unitId)
    {
        var q = db.Alerts.Where(a => !a.IsRead);
        if (Guid.TryParse(unitId, out var uid))
            q = q.Where(a => a.UnitId == uid);
        await q.ExecuteUpdateAsync(s => s.SetProperty(a => a.IsRead, true));
        return NoContent();
    }
}
