using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace Demo.Server.Infrastructure.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private static readonly JsonSerializerOptions _jsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    private readonly IHttpContextAccessor _httpContextAccessor;

    public PermissionAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null) return Task.CompletedTask;

        var unitsClaim = context.User.FindFirst("units")?.Value;
        if (unitsClaim is null) return Task.CompletedTask;

        List<UnitPermissionClaim>? units;
        try { units = JsonSerializer.Deserialize<List<UnitPermissionClaim>>(unitsClaim, _jsonOptions); }
        catch { return Task.CompletedTask; }

        if (units is null || units.Count == 0) return Task.CompletedTask;

        // If X-Unit-Id is present, check only that unit; otherwise check any unit
        var unitIdHeader = httpContext.Request.Headers["X-Unit-Id"].FirstOrDefault();

        if (!string.IsNullOrEmpty(unitIdHeader) && Guid.TryParse(unitIdHeader, out var unitId))
        {
            var unitPerms = units.FirstOrDefault(u => u.UnitId == unitId);
            if (unitPerms?.Perms?.Contains(requirement.Permission) == true)
                context.Succeed(requirement);
        }
        else
        {
            // Global check: user has permission in at least one unit
            if (units.Any(u => u.Perms?.Contains(requirement.Permission) == true))
                context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }

    private sealed record UnitPermissionClaim(Guid UnitId, string RoleName, List<string>? Perms);
}
