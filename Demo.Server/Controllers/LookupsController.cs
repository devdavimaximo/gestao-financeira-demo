using Demo.Server.Application.DTOs.Lookup;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/lookup")]
[Authorize]
public class LookupsController(AppDbContext db) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var list = await db.FinancialCategories
            .OrderBy(c => c.Name)
            .Select(c => new LookupItemDto(c.Id, c.Name))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("payment-methods")]
    public async Task<IActionResult> GetPaymentMethods()
    {
        var list = await db.PaymentMethods
            .OrderBy(m => m.Name)
            .Select(m => new LookupItemDto(m.Id, m.Name))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("sales-channels")]
    public async Task<IActionResult> GetSalesChannels()
    {
        var list = await db.SalesChannels
            .OrderBy(s => s.Name)
            .Select(s => new LookupItemDto(s.Id, s.Name))
            .ToListAsync();
        return Ok(list);
    }
}
