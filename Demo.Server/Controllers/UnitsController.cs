using Demo.Server.Application.DTOs.Units;
using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/units")]
[Authorize]
public class UnitsController : ControllerBase
{
    private readonly AppDbContext _db;

    public UnitsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var units = await _db.Units
            .OrderBy(u => u.Name)
            .Select(u => new UnitDto(u.Id, u.Name, u.Identifier, u.Status, u.CreatedAt))
            .ToListAsync();

        return Ok(units);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var unit = await _db.Units.FindAsync(id);
        if (unit is null) return NotFound();

        return Ok(new UnitDto(unit.Id, unit.Name, unit.Identifier, unit.Status, unit.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateUnitRequest request)
    {
        var unit = new Unit
        {
            Id         = Guid.NewGuid(),
            Name       = request.Name,
            Identifier = request.Identifier.ToUpperInvariant(),
            Status     = UnitStatus.Active
        };

        _db.Units.Add(unit);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = unit.Id },
            new UnitDto(unit.Id, unit.Name, unit.Identifier, unit.Status, unit.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUnitRequest request)
    {
        var unit = await _db.Units.FindAsync(id);
        if (unit is null) return NotFound();

        unit.Name       = request.Name;
        unit.Identifier = request.Identifier.ToUpperInvariant();
        unit.Status     = request.Status;

        await _db.SaveChangesAsync();
        return Ok(new UnitDto(unit.Id, unit.Name, unit.Identifier, unit.Status, unit.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var unit = await _db.Units.FindAsync(id);
        if (unit is null) return NotFound();

        unit.Status = UnitStatus.Inactive;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
