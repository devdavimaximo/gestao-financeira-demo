using Demo.Server.Application.DTOs.Units;
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
[Route("api/units")]
[Authorize]
public class UnitsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [RequirePermission(PermissionCodes.Units.View)]
    public async Task<IActionResult> GetAll()
    {
        var units = await db.Units
            .OrderBy(u => u.Name)
            .Select(u => new UnitDto(u.Id, u.Name, u.Identifier, u.Status, u.CreatedAt))
            .ToListAsync();

        return Ok(units);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionCodes.Units.View)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var unit = await db.Units.FindAsync(id);
        if (unit is null) return NotFound();

        return Ok(new UnitDto(unit.Id, unit.Name, unit.Identifier, unit.Status, unit.CreatedAt));
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.Units.Create)]
    public async Task<IActionResult> Create([FromBody] CreateUnitRequest request)
    {
        var unit = new Unit
        {
            Id         = Guid.NewGuid(),
            Name       = request.Name,
            Identifier = (request.Identifier ?? string.Empty).ToUpperInvariant(),
            Status     = UnitStatus.Active
        };

        db.Units.Add(unit);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = unit.Id },
            new UnitDto(unit.Id, unit.Name, unit.Identifier, unit.Status, unit.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Units.Edit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUnitRequest request)
    {
        var unit = await db.Units.FindAsync(id);
        if (unit is null) return NotFound();

        unit.Name       = request.Name;
        unit.Identifier = request.Identifier.ToUpperInvariant();
        unit.Status     = request.Status;

        await db.SaveChangesAsync();
        return Ok(new UnitDto(unit.Id, unit.Name, unit.Identifier, unit.Status, unit.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Units.Deactivate)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var unit = await db.Units.FindAsync(id);
        if (unit is null) return NotFound();

        unit.Status = UnitStatus.Inactive;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}/permanent")]
    [RequirePermission(PermissionCodes.Units.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var unit = await db.Units
            .Include(u => u.UserUnits)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (unit is null) return NotFound();

        var hasData =
            await db.FinancialEntries.AnyAsync(e => e.UnitId == id) ||
            await db.AccountsPayable.AnyAsync(a => a.UnitId == id)  ||
            await db.AccountsReceivable.AnyAsync(a => a.UnitId == id) ||
            await db.Budgets.AnyAsync(b => b.UnitId == id)          ||
            await db.Purchases.AnyAsync(p => p.UnitId == id);

        if (hasData)
            return Conflict(new { message = "Esta unidade possui dados financeiros associados e não pode ser excluída permanentemente. Desative-a em vez disso." });

        if (unit.UserUnits.Count > 0)
            return Conflict(new { message = $"Esta unidade possui {unit.UserUnits.Count} usuário(s) vinculado(s). Remova-os antes de excluir." });

        db.Units.Remove(unit);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
