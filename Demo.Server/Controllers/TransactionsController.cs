using Demo.Server.DTOs;
using Demo.Server.Models;
using Demo.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController(ITransactionService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? accountId,
        [FromQuery] int? categoryId,
        [FromQuery] TransactionType? type,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var result = await service.GetAllAsync(accountId, categoryId, type, from, to);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTransactionDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
