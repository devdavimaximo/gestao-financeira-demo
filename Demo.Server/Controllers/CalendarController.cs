using Demo.Server.Application.DTOs.Calendar;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController(AppDbContext db) : ControllerBase
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
        var to = new DateOnly(y, m, DateTime.DaysInMonth(y, m));

        Guid? uid = Guid.TryParse(unitId, out var parsedUid) ? parsedUid : null;

        var events = new List<CalendarEventDto>();

        // Payables due this month
        var payablesQ = db.AccountsPayable
            .Where(p => p.DueDate >= from && p.DueDate <= to && p.Status != AccountPayableStatus.Cancelled);
        if (uid.HasValue) payablesQ = payablesQ.Where(p => p.UnitId == uid.Value);

        var payables = await payablesQ
            .Select(p => new CalendarEventDto(
                p.Id, p.Description, p.Amount,
                p.DueDate.ToString("yyyy-MM-dd"),
                "Payable", p.Status.ToString(), p.Unit.Name))
            .ToListAsync();
        events.AddRange(payables);

        // Receivables expected this month
        var receivablesQ = db.AccountsReceivable
            .Where(r => r.ExpectedDate >= from && r.ExpectedDate <= to && r.Status != AccountReceivableStatus.Cancelled);
        if (uid.HasValue) receivablesQ = receivablesQ.Where(r => r.UnitId == uid.Value);

        var receivables = await receivablesQ
            .Select(r => new CalendarEventDto(
                r.Id, r.Description, r.ExpectedAmount,
                r.ExpectedDate.ToString("yyyy-MM-dd"),
                "Receivable", r.Status.ToString(), r.Unit.Name))
            .ToListAsync();
        events.AddRange(receivables);

        // Entries this month
        var entriesQ = db.FinancialEntries
            .Where(e => e.Date >= from && e.Date <= to);
        if (uid.HasValue) entriesQ = entriesQ.Where(e => e.UnitId == uid.Value);

        var entries = await entriesQ
            .Select(e => new CalendarEventDto(
                e.Id, e.Description, e.Amount,
                e.Date.ToString("yyyy-MM-dd"),
                e.Type == FinancialEntryType.Revenue ? "Revenue" : "Expense",
                e.Type.ToString(), e.Unit.Name))
            .ToListAsync();
        events.AddRange(entries);

        return Ok(events.OrderBy(e => e.Date).ToList());
    }
}
