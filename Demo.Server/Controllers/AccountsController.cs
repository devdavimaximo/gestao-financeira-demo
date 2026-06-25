using Demo.Server.DTOs;
using Demo.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountsController(IAccountService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = false)
    {
        var result = await service.GetAllAsync(activeOnly);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAccountDto dto)
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
