using Demo.Server.Application.DTOs.Dashboard;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? unitId,
        [FromQuery] int? month,
        [FromQuery] int? year)
    {
        var now = DateTime.Today;
        var m = month ?? now.Month;
        var y = year ?? now.Year;

        var from = new DateOnly(y, m, 1);
        var to   = new DateOnly(y, m, DateTime.DaysInMonth(y, m));

        Guid? uid = Guid.TryParse(unitId, out var parsedUid) ? parsedUid : null;

        // ── KPIs — current period ────────────────────────────────────────────
        var periodEntries = await db.FinancialEntries
            .Where(e => e.Date >= from && e.Date <= to
                     && (!uid.HasValue || e.UnitId == uid.Value))
            .Select(e => new { e.Type, e.Amount })
            .ToListAsync();

        var revenue  = periodEntries.Where(e => e.Type == FinancialEntryType.Revenue).Sum(e => e.Amount);
        var expenses = periodEntries.Where(e => e.Type == FinancialEntryType.Expense).Sum(e => e.Amount);

        var pendingPayables = await db.AccountsPayable
            .Where(p => (!uid.HasValue || p.UnitId == uid.Value)
                     && (p.Status == AccountPayableStatus.Pending || p.Status == AccountPayableStatus.Overdue))
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var pendingReceivables = await db.AccountsReceivable
            .Where(r => (!uid.HasValue || r.UnitId == uid.Value)
                     && (r.Status == AccountReceivableStatus.Pending || r.Status == AccountReceivableStatus.Overdue))
            .SumAsync(r => (decimal?)r.ExpectedAmount) ?? 0m;

        var unreadAlerts = await db.Alerts
            .CountAsync(a => (!uid.HasValue || a.UnitId == uid.Value) && !a.IsRead);

        var kpis = new DashboardKpiDto(revenue, expenses, revenue - expenses,
                                       pendingPayables, pendingReceivables, unreadAlerts);

        // ── Monthly chart — last 6 months (in-memory grouping) ───────────────
        var chartFrom = from.AddMonths(-5);
        var chartEntries = await db.FinancialEntries
            .Where(e => e.Date >= chartFrom && e.Date <= to
                     && (!uid.HasValue || e.UnitId == uid.Value))
            .Select(e => new { e.Date.Year, e.Date.Month, e.Type, e.Amount })
            .ToListAsync();

        var chart = Enumerable.Range(0, 6).Select(i =>
        {
            var d   = from.AddMonths(-5 + i);
            var grp = chartEntries.Where(e => e.Year == d.Year && e.Month == d.Month).ToList();
            var rev = grp.Where(e => e.Type == FinancialEntryType.Revenue).Sum(e => e.Amount);
            var exp = grp.Where(e => e.Type == FinancialEntryType.Expense).Sum(e => e.Amount);
            return new ChartPointDto($"{MonthAbbr(d.Month)}/{d.Year % 100:D2}", rev, exp);
        }).ToList();

        // ── Top expense categories (safe: select before group) ───────────────
        var expenseRows = await db.FinancialEntries
            .Where(e => e.Date >= from && e.Date <= to
                     && e.Type == FinancialEntryType.Expense
                     && (!uid.HasValue || e.UnitId == uid.Value))
            .Select(e => new { CategoryName = e.Category.Name, e.Amount })
            .ToListAsync();

        var topExpenses = expenseRows
            .GroupBy(e => e.CategoryName)
            .Select(g => new CategorySummaryDto(g.Key, g.Sum(e => e.Amount), g.Count()))
            .OrderByDescending(c => c.Amount)
            .Take(5)
            .ToList();

        // ── Top revenue categories ────────────────────────────────────────────
        var revenueRows = await db.FinancialEntries
            .Where(e => e.Date >= from && e.Date <= to
                     && e.Type == FinancialEntryType.Revenue
                     && (!uid.HasValue || e.UnitId == uid.Value))
            .Select(e => new { CategoryName = e.Category.Name, e.Amount })
            .ToListAsync();

        var topRevenues = revenueRows
            .GroupBy(e => e.CategoryName)
            .Select(g => new CategorySummaryDto(g.Key, g.Sum(e => e.Amount), g.Count()))
            .OrderByDescending(c => c.Amount)
            .Take(5)
            .ToList();

        return Ok(new DashboardDto(kpis, chart, topExpenses, topRevenues));
    }

    private static string MonthAbbr(int month) => month switch
    {
        1 => "Jan", 2 => "Fev", 3 => "Mar", 4 => "Abr",
        5 => "Mai", 6 => "Jun", 7 => "Jul", 8 => "Ago",
        9 => "Set", 10 => "Out", 11 => "Nov", 12 => "Dez",
        _ => ""
    };
}
