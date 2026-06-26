using Demo.Server.Application.DTOs.Receivables;
using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/receivables")]
[Authorize]
public class AccountsReceivableController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? unitId,
        [FromQuery] AccountReceivableStatus? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var query = db.AccountsReceivable.AsQueryable();

        if (unitId.HasValue) query = query.Where(r => r.UnitId == unitId);
        if (status.HasValue) query = query.Where(r => r.Status == status);
        if (from.HasValue)   query = query.Where(r => r.ExpectedDate >= from);
        if (to.HasValue)     query = query.Where(r => r.ExpectedDate <= to);

        var list = await query
            .OrderBy(r => r.ExpectedDate)
            .Select(r => new AccountReceivableDto(
                r.Id, r.Description, r.ExpectedAmount, r.ReceivedAmount,
                r.ExpectedDate, r.ReceivedDate, r.Status, r.Notes,
                r.UnitId, r.Unit.Name,
                r.CategoryId, r.Category.Name,
                r.PaymentMethodId, r.PaymentMethod != null ? r.PaymentMethod.Name : null))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Financial")]
    public async Task<IActionResult> Create([FromBody] CreateReceivableRequest req)
    {
        var receivable = new AccountReceivable
        {
            Id              = Guid.NewGuid(),
            Description     = req.Description,
            ExpectedAmount  = req.ExpectedAmount,
            ExpectedDate    = req.ExpectedDate,
            Notes           = req.Notes,
            Status          = AccountReceivableStatus.Pending,
            UnitId          = req.UnitId,
            CategoryId      = req.CategoryId,
            PaymentMethodId = req.PaymentMethodId
        };

        db.AccountsReceivable.Add(receivable);
        await db.SaveChangesAsync();
        return Ok(await ProjectDto(receivable.Id));
    }

    [HttpPost("{id:guid}/receive")]
    [Authorize(Roles = "Admin,Financial")]
    public async Task<IActionResult> Receive(Guid id, [FromBody] ReceiveRequest req)
    {
        var receivable = await db.AccountsReceivable.FindAsync(id);
        if (receivable is null) return NotFound();
        if (receivable.Status == AccountReceivableStatus.Received)
            return BadRequest(new { message = "Recebimento já registrado." });

        receivable.Status         = AccountReceivableStatus.Received;
        receivable.ReceivedAmount = req.ReceivedAmount;
        receivable.ReceivedDate   = req.ReceivedDate;

        await db.SaveChangesAsync();
        return Ok(await ProjectDto(id));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Financial")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var receivable = await db.AccountsReceivable.FindAsync(id);
        if (receivable is null) return NotFound();
        receivable.Status = AccountReceivableStatus.Cancelled;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<AccountReceivableDto> ProjectDto(Guid id) =>
        db.AccountsReceivable
            .Where(r => r.Id == id)
            .Select(r => new AccountReceivableDto(
                r.Id, r.Description, r.ExpectedAmount, r.ReceivedAmount,
                r.ExpectedDate, r.ReceivedDate, r.Status, r.Notes,
                r.UnitId, r.Unit.Name,
                r.CategoryId, r.Category.Name,
                r.PaymentMethodId, r.PaymentMethod != null ? r.PaymentMethod.Name : null))
            .FirstAsync();
}
