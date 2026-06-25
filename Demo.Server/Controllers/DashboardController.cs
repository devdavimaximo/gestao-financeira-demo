using Demo.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(IDashboardService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSummary([FromQuery] int? month, [FromQuery] int? year)
    {
        var result = await service.GetSummaryAsync(month, year);
        return Ok(result);
    }
}
