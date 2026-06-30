using Demo.Server.Application.DTOs.Payables;
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
[Route("api/payables")]
[Authorize]
[ValidateUnitAccess]
public class AccountsPayableController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [RequirePermission(PermissionCodes.Payables.View)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? unitId,
        [FromQuery] AccountPayableStatus? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var query = db.AccountsPayable.AsQueryable();

        if (unitId.HasValue) query = query.Where(p => p.UnitId == unitId);
        if (status.HasValue) query = query.Where(p => p.Status == status);
        if (from.HasValue)   query = query.Where(p => p.DueDate >= from);
        if (to.HasValue)     query = query.Where(p => p.DueDate <= to);

        var list = await query
            .OrderBy(p => p.DueDate)
            .Select(p => new AccountPayableDto(
                p.Id, p.Description, p.Amount, p.DueDate, p.PaidDate, p.PaidAmount,
                p.Status, p.Notes,
                p.UnitId, p.Unit.Name,
                p.CategoryId, p.Category.Name,
                p.PaymentMethodId, p.PaymentMethod != null ? p.PaymentMethod.Name : null))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [RequirePermission(PermissionCodes.Payables.Create)]
    public async Task<IActionResult> Create([FromBody] CreatePayableRequest req)
    {
        var payable = new AccountPayable
        {
            Id              = Guid.NewGuid(),
            Description     = req.Description,
            Amount          = req.Amount,
            DueDate         = req.DueDate,
            Notes           = req.Notes,
            Status          = AccountPayableStatus.Pending,
            UnitId          = req.UnitId,
            CategoryId      = req.CategoryId,
            PaymentMethodId = req.PaymentMethodId
        };

        db.AccountsPayable.Add(payable);
        await db.SaveChangesAsync();
        return Ok(await ProjectDto(payable.Id));
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionCodes.Payables.Edit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePayableRequest req)
    {
        var payable = await db.AccountsPayable.FindAsync(id);
        if (payable is null) return NotFound();
        if (payable.Status == AccountPayableStatus.Paid)
            return BadRequest(new { message = "Conta já paga não pode ser editada." });

        payable.Description     = req.Description;
        payable.Amount          = req.Amount;
        payable.DueDate         = req.DueDate;
        payable.Notes           = req.Notes;
        payable.CategoryId      = req.CategoryId;
        payable.PaymentMethodId = req.PaymentMethodId;

        await db.SaveChangesAsync();
        return Ok(await ProjectDto(id));
    }

    [HttpPost("{id:guid}/pay")]
    [RequirePermission(PermissionCodes.Payables.Pay)]
    public async Task<IActionResult> Pay(Guid id, [FromBody] PayPayableRequest req)
    {
        var payable = await db.AccountsPayable.FindAsync(id);
        if (payable is null) return NotFound();
        if (payable.Status == AccountPayableStatus.Paid)
            return BadRequest(new { message = "Conta já está paga." });

        payable.Status          = AccountPayableStatus.Paid;
        payable.PaidDate        = req.PaidDate;
        payable.PaidAmount      = req.PaidAmount;
        payable.PaymentMethodId = req.PaymentMethodId;

        await db.SaveChangesAsync();
        return Ok(await ProjectDto(id));
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionCodes.Payables.Cancel)]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var payable = await db.AccountsPayable.FindAsync(id);
        if (payable is null) return NotFound();
        payable.Status = AccountPayableStatus.Cancelled;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<AccountPayableDto> ProjectDto(Guid id) =>
        db.AccountsPayable
            .Where(p => p.Id == id)
            .Select(p => new AccountPayableDto(
                p.Id, p.Description, p.Amount, p.DueDate, p.PaidDate, p.PaidAmount,
                p.Status, p.Notes,
                p.UnitId, p.Unit.Name,
                p.CategoryId, p.Category.Name,
                p.PaymentMethodId, p.PaymentMethod != null ? p.PaymentMethod.Name : null))
            .FirstAsync();
}
