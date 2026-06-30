using Demo.Server.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Demo.Server.Infrastructure.Middleware;

/// <summary>
/// Rejects requests whose JWT jti has been revoked (logout, block, password reset).
/// Uses a 30-second in-memory cache to avoid a DB hit on every request.
/// </summary>
public class SessionValidationMiddleware(RequestDelegate next, IMemoryCache cache)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var jti = context.User.FindFirst(
                System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;

            if (jti is not null && !await IsSessionValidAsync(jti, db))
            {
                context.Response.StatusCode  = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(
                    new { message = "Sessão encerrada. Faça login novamente." });
                return;
            }
        }

        await next(context);
    }

    private async Task<bool> IsSessionValidAsync(string jti, AppDbContext db)
    {
        var key = $"session_valid:{jti}";

        if (cache.TryGetValue(key, out bool cached))
            return cached;

        var session = await db.UserSessions
            .AsNoTracking()
            .Where(s => s.JwtId == jti)
            .Select(s => new { s.IsRevoked, s.ExpiresAt })
            .FirstOrDefaultAsync();

        // Treat unknown sessions as invalid — prevents tokens issued before the
        // session tracking was introduced from bypassing validation.
        var valid = session is not null && !session.IsRevoked && session.ExpiresAt > DateTime.UtcNow;

        cache.Set(key, valid, TimeSpan.FromSeconds(30));

        return valid;
    }
}
