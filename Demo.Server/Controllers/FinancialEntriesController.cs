using Demo.Server.Application.DTOs.Entries;
using Demo.Server.Domain.Constants;
using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Authorization;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/entries")]
[Authorize]
[ValidateUnitAccess]
public class FinancialEntriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? unitId,
        [FromQuery] FinancialEntryType? type,
        [FromQuery] Guid? categoryId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var query = db.FinancialEntries.AsQueryable();

        if (unitId.HasValue)     query = query.Where(e => e.UnitId == unitId);
        if (type.HasValue)       query = query.Where(e => e.Type == type);
        if (categoryId.HasValue) query = query.Where(e => e.CategoryId == categoryId);
        if (from.HasValue)       query = query.Where(e => e.Date >= from);
        if (to.HasValue)         query = query.Where(e => e.Date <= to);

        var entries = await query
            .OrderByDescending(e => e.Date)
            .ThenByDescending(e => e.CreatedAt)
            .Select(e => new FinancialEntryDto(
                e.Id, e.Description, e.Amount, e.Type, e.Date, e.Notes,
                e.UnitId, e.Unit.Name,
                e.CategoryId, e.Category.Name,
                e.PaymentMethodId, e.PaymentMethod.Name,
                e.SalesChannelId, e.SalesChannel != null ? e.SalesChannel.Name : null,
                e.ParentEntryId, e.RecurrenceFrequency, e.RecurrenceInterval, e.RecurrenceEndDate))
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.Financial.Create)]
    public async Task<IActionResult> Create([FromBody] CreateEntryRequest req)
    {
        if (req.IsRecurring)
        {
            if (req.RecurrenceFrequency is null || req.RecurrenceEndDate is null)
                return BadRequest(new { message = "Informe o tipo e a data final da recorrência." });

            if (req.RecurrenceEndDate <= req.Date)
                return BadRequest(new { message = "A data final deve ser posterior à data do lançamento." });

            var dates = GenerateDates(req.Date, req.RecurrenceFrequency.Value, req.RecurrenceInterval ?? 1, req.RecurrenceEndDate.Value);

            if (dates.Count > 120)
                return BadRequest(new { message = "A série não pode ter mais de 120 lançamentos. Reduza o período ou o intervalo." });

            var parent = BuildEntry(req);
            parent.Date                 = dates[0];
            parent.RecurrenceFrequency  = req.RecurrenceFrequency;
            parent.RecurrenceInterval   = req.RecurrenceInterval ?? 1;
            parent.RecurrenceEndDate    = req.RecurrenceEndDate;

            db.FinancialEntries.Add(parent);
            await db.SaveChangesAsync();

            var children = dates.Skip(1).Select(d =>
            {
                var child = BuildEntry(req);
                child.Date          = d;
                child.ParentEntryId = parent.Id;
                return child;
            }).ToList();

            db.FinancialEntries.AddRange(children);
            await db.SaveChangesAsync();

            return Ok(await ProjectDto(parent.Id));
        }

        var entry = BuildEntry(req);
        db.FinancialEntries.Add(entry);
        await db.SaveChangesAsync();
        return Ok(await ProjectDto(entry.Id));
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Financial.Edit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEntryRequest req)
    {
        var entry = await db.FinancialEntries.FindAsync(id);
        if (entry is null) return NotFound();

        if (req.Scope == "all")
        {
            var parentId = entry.ParentEntryId ?? entry.Id;
            var series = await db.FinancialEntries
                .Where(e => e.Id == parentId || e.ParentEntryId == parentId)
                .ToListAsync();

            foreach (var e in series)
            {
                e.Description     = req.Description;
                e.Amount          = req.Amount;
                e.Type            = req.Type;
                e.Notes           = req.Notes;
                e.CategoryId      = req.CategoryId;
                e.PaymentMethodId = req.PaymentMethodId;
                e.SalesChannelId  = req.SalesChannelId;
                // Date is intentionally kept per-entry
            }
        }
        else
        {
            entry.Description     = req.Description;
            entry.Amount          = req.Amount;
            entry.Type            = req.Type;
            entry.Date            = req.Date;
            entry.Notes           = req.Notes;
            entry.CategoryId      = req.CategoryId;
            entry.PaymentMethodId = req.PaymentMethodId;
            entry.SalesChannelId  = req.SalesChannelId;
        }

        await db.SaveChangesAsync();
        return Ok(await ProjectDto(id));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Financial.Delete)]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] string scope = "single")
    {
        var entry = await db.FinancialEntries.FindAsync(id);
        if (entry is null) return NotFound();

        if (scope == "all")
        {
            var parentId = entry.ParentEntryId ?? entry.Id;
            var series = await db.FinancialEntries
                .Where(e => e.Id == parentId || e.ParentEntryId == parentId)
                .ToListAsync();
            db.FinancialEntries.RemoveRange(series);
        }
        else
        {
            db.FinancialEntries.Remove(entry);
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static FinancialEntry BuildEntry(CreateEntryRequest req) => new()
    {
        Id              = Guid.NewGuid(),
        Description     = req.Description,
        Amount          = req.Amount,
        Type            = req.Type,
        Date            = req.Date,
        Notes           = req.Notes,
        UnitId          = req.UnitId,
        CategoryId      = req.CategoryId,
        PaymentMethodId = req.PaymentMethodId,
        SalesChannelId  = req.SalesChannelId,
    };

    private static List<DateOnly> GenerateDates(DateOnly start, RecurrenceType frequency, int interval, DateOnly end)
    {
        var dates = new List<DateOnly>();
        var current = start;
        while (current <= end)
        {
            dates.Add(current);
            current = frequency switch
            {
                RecurrenceType.Weekly  => current.AddDays(7 * interval),
                RecurrenceType.Monthly => current.AddMonths(interval),
                RecurrenceType.Yearly  => current.AddYears(interval),
                _ => throw new ArgumentOutOfRangeException(nameof(frequency))
            };
        }
        return dates;
    }

    private Task<FinancialEntryDto> ProjectDto(Guid id) =>
        db.FinancialEntries
            .Where(e => e.Id == id)
            .Select(e => new FinancialEntryDto(
                e.Id, e.Description, e.Amount, e.Type, e.Date, e.Notes,
                e.UnitId, e.Unit.Name,
                e.CategoryId, e.Category.Name,
                e.PaymentMethodId, e.PaymentMethod.Name,
                e.SalesChannelId, e.SalesChannel != null ? e.SalesChannel.Name : null,
                e.ParentEntryId, e.RecurrenceFrequency, e.RecurrenceInterval, e.RecurrenceEndDate))
            .FirstAsync();
}
