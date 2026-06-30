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
                e.SalesChannelId, e.SalesChannel != null ? e.SalesChannel.Name : null))
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.Financial.Create)]
    public async Task<IActionResult> Create([FromBody] CreateEntryRequest req)
    {
        var entry = new FinancialEntry
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
            SalesChannelId  = req.SalesChannelId
        };

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

        entry.Description     = req.Description;
        entry.Amount          = req.Amount;
        entry.Type            = req.Type;
        entry.Date            = req.Date;
        entry.Notes           = req.Notes;
        entry.CategoryId      = req.CategoryId;
        entry.PaymentMethodId = req.PaymentMethodId;
        entry.SalesChannelId  = req.SalesChannelId;

        await db.SaveChangesAsync();
        return Ok(await ProjectDto(id));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Financial.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await db.FinancialEntries.FindAsync(id);
        if (entry is null) return NotFound();
        db.FinancialEntries.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<FinancialEntryDto> ProjectDto(Guid id) =>
        db.FinancialEntries
            .Where(e => e.Id == id)
            .Select(e => new FinancialEntryDto(
                e.Id, e.Description, e.Amount, e.Type, e.Date, e.Notes,
                e.UnitId, e.Unit.Name,
                e.CategoryId, e.Category.Name,
                e.PaymentMethodId, e.PaymentMethod.Name,
                e.SalesChannelId, e.SalesChannel != null ? e.SalesChannel.Name : null))
            .FirstAsync();
}
