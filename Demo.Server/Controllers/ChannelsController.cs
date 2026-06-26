using Demo.Server.Application.DTOs.Channels;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/channels")]
[Authorize]
public class ChannelsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? unitId,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var now = DateOnly.FromDateTime(DateTime.Today);
        var dateFrom = from != null && DateOnly.TryParse(from, out var f) ? f : new DateOnly(now.Year, now.Month, 1);
        var dateTo   = to   != null && DateOnly.TryParse(to,   out var t) ? t : now;

        Guid? uid = Guid.TryParse(unitId, out var parsedUid) ? parsedUid : null;

        // Select before group to avoid EF Core navigation translation issues
        var rows = await db.FinancialEntries
            .Where(e => e.Type == FinancialEntryType.Revenue
                     && e.Date >= dateFrom
                     && e.Date <= dateTo
                     && e.SalesChannelId != null
                     && (!uid.HasValue || e.UnitId == uid.Value))
            .Select(e => new { ChannelName = e.SalesChannel!.Name, e.Amount })
            .ToListAsync();

        var total = rows.Sum(r => r.Amount);

        var result = rows
            .GroupBy(r => r.ChannelName)
            .Select(g => new ChannelSummaryDto(
                g.Key,
                g.Sum(r => r.Amount),
                g.Count(),
                total > 0 ? Math.Round(g.Sum(r => r.Amount) / total * 100, 1) : 0))
            .OrderByDescending(c => c.Amount)
            .ToList();

        return Ok(result);
    }
}
