using Demo.Server.Application.DTOs.Purchases;
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
[Route("api/purchases")]
[Authorize]
[ValidateUnitAccess]
public class PurchasesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [RequirePermission(PermissionCodes.Purchases.View)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? unitId,
        [FromQuery] Guid? budgetId,
        [FromQuery] PurchaseStatus? status)
    {
        var query = db.Purchases.AsQueryable();

        if (unitId.HasValue)   query = query.Where(p => p.UnitId == unitId);
        if (budgetId.HasValue) query = query.Where(p => p.BudgetId == budgetId);
        if (status.HasValue)   query = query.Where(p => p.Status == status);

        var list = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PurchaseDto(
                p.Id, p.Description, p.Amount, p.DueDate, p.Status, p.Notes,
                p.UnitId, p.Unit.Name,
                p.BudgetId, p.Budget.Description,
                p.CategoryId, p.Category.Name))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.Purchases.Create)]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseRequest req)
    {
        var budget = await db.Budgets.FindAsync(req.BudgetId);
        if (budget is null) return BadRequest(new { message = "Verba não encontrada." });

        var purchase = new Purchase
        {
            Id          = Guid.NewGuid(),
            Description = req.Description,
            Amount      = req.Amount,
            DueDate     = req.DueDate,
            Notes       = req.Notes,
            Status      = PurchaseStatus.Intended,
            UnitId      = req.UnitId,
            CategoryId  = req.CategoryId,
            BudgetId    = req.BudgetId
        };

        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();
        return Ok(await ProjectDto(purchase.Id));
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Purchases.Edit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePurchaseRequest req)
    {
        var purchase = await db.Purchases.FindAsync(id);
        if (purchase is null) return NotFound();

        var oldStatus    = purchase.Status;
        purchase.Description = req.Description;
        purchase.Amount      = req.Amount;
        purchase.DueDate     = req.DueDate;
        purchase.Notes       = req.Notes;
        purchase.CategoryId  = req.CategoryId;
        purchase.Status      = req.Status;

        await db.SaveChangesAsync();

        if (oldStatus != req.Status || req.Status == PurchaseStatus.Confirmed)
            await RecalculateBudget(purchase.BudgetId);

        return Ok(await ProjectDto(id));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Purchases.Cancel)]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var purchase = await db.Purchases.FindAsync(id);
        if (purchase is null) return NotFound();

        purchase.Status = PurchaseStatus.Cancelled;
        await db.SaveChangesAsync();
        await RecalculateBudget(purchase.BudgetId);
        return NoContent();
    }

    private async Task RecalculateBudget(Guid budgetId)
    {
        var budget = await db.Budgets.FindAsync(budgetId);
        if (budget is null) return;

        budget.UsedAmount = await db.Purchases
            .Where(p => p.BudgetId == budgetId && p.Status == PurchaseStatus.Confirmed)
            .SumAsync(p => p.Amount);

        if (budget.Status != BudgetStatus.Closed)
            budget.Status = budget.UsedAmount > budget.TotalAmount
                ? BudgetStatus.Exceeded : BudgetStatus.Active;

        await db.SaveChangesAsync();
    }

    private Task<PurchaseDto> ProjectDto(Guid id) =>
        db.Purchases
            .Where(p => p.Id == id)
            .Select(p => new PurchaseDto(
                p.Id, p.Description, p.Amount, p.DueDate, p.Status, p.Notes,
                p.UnitId, p.Unit.Name,
                p.BudgetId, p.Budget.Description,
                p.CategoryId, p.Category.Name))
            .FirstAsync();
}
