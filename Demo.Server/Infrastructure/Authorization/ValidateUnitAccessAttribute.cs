using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Demo.Server.Infrastructure.Authorization;

/// <summary>
/// Verifies that the unitId supplied in the query string or X-Unit-Id header
/// belongs to the authenticated user (present in the JWT units[] claim).
/// Short-circuits with 403 if the unit is not in the user's list.
/// Has no effect when no unitId is supplied (returns all accessible data).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class ValidateUnitAccessAttribute : Attribute, IActionFilter
{
    private static readonly JsonSerializerOptions _opts =
        new() { PropertyNameCaseInsensitive = true };

    public void OnActionExecuting(ActionExecutingContext context)
    {
        var unitIdStr = context.HttpContext.Request.Query["unitId"].FirstOrDefault()
                     ?? context.HttpContext.Request.Headers["X-Unit-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(unitIdStr) || !Guid.TryParse(unitIdStr, out var requestedUnitId))
            return;

        var unitsClaim = context.HttpContext.User.FindFirst("units")?.Value;
        if (unitsClaim is null)
        {
            context.Result = Forbidden("Sem unidades associadas.");
            return;
        }

        List<UnitIdClaim>? units;
        try   { units = JsonSerializer.Deserialize<List<UnitIdClaim>>(unitsClaim, _opts); }
        catch { units = null; }

        if (units is null || !units.Any(u => u.UnitId == requestedUnitId))
            context.Result = Forbidden("Acesso negado à unidade solicitada.");
    }

    public void OnActionExecuted(ActionExecutedContext context) { }

    private static JsonResult Forbidden(string message) =>
        new(new { message }) { StatusCode = 403 };

    private sealed record UnitIdClaim(Guid UnitId);
}
