using Demo.Server.Application.DTOs.Budgets;
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
[Route("api/budgets")]
[Authorize]
[ValidateUnitAccess]
public class BudgetsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [RequirePermission(PermissionCodes.Budgets.View)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? unitId,
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] BudgetStatus? status)
    {
        var query = db.Budgets.AsQueryable();

        if (unitId.HasValue) query = query.Where(b => b.UnitId == unitId);
        if (month.HasValue)  query = query.Where(b => b.Month == month);
        if (year.HasValue)   query = query.Where(b => b.Year == year);
        if (status.HasValue) query = query.Where(b => b.Status == status);

        var list = await query
            .OrderByDescending(b => b.Year)
            .ThenByDescending(b => b.Month)
            .Select(b => new BudgetDto(
                b.Id, b.Description, b.TotalAmount, b.UsedAmount,
                b.TotalAmount - b.UsedAmount,
                b.Month, b.Year, b.Status,
                b.UnitId, b.Unit.Name))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.Budgets.Create)]
    public async Task<IActionResult> Create([FromBody] CreateBudgetRequest req)
    {
        var budget = new Budget
        {
            Id          = Guid.NewGuid(),
            Description = req.Description,
            TotalAmount = req.TotalAmount,
            UsedAmount  = 0,
            Month       = req.Month,
            Year        = req.Year,
            Status      = BudgetStatus.Active,
            UnitId      = req.UnitId
        };

        db.Budgets.Add(budget);
        await db.SaveChangesAsync();
        return Ok(await ProjectDto(budget.Id));
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Budgets.Edit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBudgetRequest req)
    {
        var budget = await db.Budgets.FindAsync(id);
        if (budget is null) return NotFound();

        budget.Description = req.Description;
        budget.TotalAmount = req.TotalAmount;

        if (budget.Status != BudgetStatus.Closed)
            budget.Status = budget.UsedAmount > budget.TotalAmount
                ? BudgetStatus.Exceeded
                : BudgetStatus.Active;

        await db.SaveChangesAsync();
        return Ok(await ProjectDto(id));
    }

    private Task<BudgetDto> ProjectDto(Guid id) =>
        db.Budgets
            .Where(b => b.Id == id)
            .Select(b => new BudgetDto(
                b.Id, b.Description, b.TotalAmount, b.UsedAmount,
                b.TotalAmount - b.UsedAmount,
                b.Month, b.Year, b.Status,
                b.UnitId, b.Unit.Name))
            .FirstAsync();
}
