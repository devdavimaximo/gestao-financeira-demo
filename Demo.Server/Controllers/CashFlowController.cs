using Demo.Server.Application.DTOs.CashFlow;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/cashflow")]
[Authorize]
public class CashFlowController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? unitId,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var now = DateOnly.FromDateTime(DateTime.Today);
        var dateFrom = from != null && DateOnly.TryParse(from, out var f) ? f : now.AddDays(-29);
        var dateTo   = to   != null && DateOnly.TryParse(to,   out var t) ? t : now;

        var q = db.FinancialEntries
            .Where(e => e.Date >= dateFrom && e.Date <= dateTo);

        if (Guid.TryParse(unitId, out var uid))
            q = q.Where(e => e.UnitId == uid);

        var entries = await q
            .Select(e => new { e.Date, e.Type, e.Amount })
            .ToListAsync();

        // Build daily points
        var days = (dateTo.DayNumber - dateFrom.DayNumber) + 1;
        decimal running = 0m;

        var points = Enumerable.Range(0, days).Select(i =>
        {
            var day = dateFrom.AddDays(i);
            var dayEntries = entries.Where(e => e.Date == day).ToList();
            var rev = dayEntries.Where(e => e.Type == FinancialEntryType.Revenue).Sum(e => e.Amount);
            var exp = dayEntries.Where(e => e.Type == FinancialEntryType.Expense).Sum(e => e.Amount);
            running += rev - exp;
            return new CashFlowPointDto(
                day.ToString("dd/MM"),
                day.ToString("yyyy-MM-dd"),
                rev, exp,
                rev - exp,
                running
            );
        }).ToList();

        var totalRevenue = entries.Where(e => e.Type == FinancialEntryType.Revenue).Sum(e => e.Amount);
        var totalExpenses = entries.Where(e => e.Type == FinancialEntryType.Expense).Sum(e => e.Amount);

        return Ok(new CashFlowDto(points, totalRevenue, totalExpenses, totalRevenue - totalExpenses));
    }
}
