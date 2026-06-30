using Demo.Server.Application.DTOs.Auth;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const int DefaultMaxLoginAttempts = 5;

    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IPermissionResolverService _permissionResolver;
    private readonly IAuditService _audit;
    private readonly ISessionService _session;
    private readonly AppDbContext _db;

    public AuthController(
        UserManager<AppUser> userManager,
        IJwtService jwtService,
        IPermissionResolverService permissionResolver,
        IAuditService audit,
        ISessionService session,
        AppDbContext db)
    {
        _userManager        = userManager;
        _jwtService         = jwtService;
        _permissionResolver = permissionResolver;
        _audit              = audit;
        _session            = session;
        _db                 = db;
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var ua = Request.Headers.UserAgent.ToString();

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return Unauthorized(new { message = "E-mail ou senha inválidos." });

        // Auto-unblock expired suspensions before status checks
        if (user.Status == UserStatus.Suspended
            && user.BlockedUntil.HasValue
            && user.BlockedUntil.Value <= DateTime.UtcNow)
        {
            user.Status       = UserStatus.Active;
            user.BlockedUntil = null;
            await _userManager.UpdateAsync(user);
        }

        var statusError = user.Status switch
        {
            UserStatus.Blocked            => "Conta bloqueada. Entre em contato com o administrador.",
            UserStatus.Suspended          => $"Conta suspensa temporariamente{FormatUntil(user.BlockedUntil)}.",
            UserStatus.Deactivated        => "Conta desativada.",
            UserStatus.AwaitingActivation => "Conta aguardando ativação pelo administrador.",
            _                             => null
        };

        if (statusError is not null)
            return Unauthorized(new { message = statusError });

        // Password validation with failed-attempt tracking
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            user.AccessFailedCount++;
            var maxAttempts = user.MaxLoginAttempts ?? DefaultMaxLoginAttempts;

            if (user.AccessFailedCount >= maxAttempts)
            {
                user.Status            = UserStatus.Blocked;
                user.AccessFailedCount = 0;
                await _userManager.UpdateAsync(user);
                await _session.RevokeAllForUserAsync(user.Id);

                await _audit.LogAsync("UserBlocked", "User", user.Id.ToString(),
                    after: new { reason = "MaxLoginAttempts exceeded", attempts = maxAttempts },
                    ipAddress: ip, userAgent: ua);
            }
            else
            {
                await _userManager.UpdateAsync(user);
            }

            // Audit failed login; save it and any pending entries (e.g. UserBlocked above)
            await _audit.LogAsync("LoginFailed", "User", user.Id.ToString(),
                after: new { reason = "InvalidPassword", attempt = user.AccessFailedCount, ip },
                ipAddress: ip, userAgent: ua);
            await _db.SaveChangesAsync();

            return Unauthorized(new { message = "E-mail ou senha inválidos." });
        }

        // Reset failed-attempt counter on successful authentication
        if (user.AccessFailedCount > 0)
        {
            user.AccessFailedCount = 0;
            await _userManager.UpdateAsync(user);
        }

        var unitPermissions = await _permissionResolver.ResolveAsync(user.Id);
        var (token, jwtId, expiresAt) = _jwtService.GenerateToken(user, unitPermissions);

        // Add session + audit to the change tracker, then persist both in one transaction
        _db.UserSessions.Add(new UserSession
        {
            Id         = Guid.NewGuid(),
            UserId     = user.Id,
            JwtId      = jwtId,
            IpAddress  = ip,
            UserAgent  = ua,
            ExpiresAt  = expiresAt,
            LastSeenAt = DateTime.UtcNow
        });
        await _audit.LogAsync("LoginSuccess", "User", user.Id.ToString(),
            after: new { jwtId, ip, ua },
            actorUserId: user.Id, ipAddress: ip, userAgent: ua);
        await _db.SaveChangesAsync();

        return Ok(BuildResponse(token, user, unitPermissions, expiresAt));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirst(
            System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!.Value);

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

        var jwtId   = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
        var session = jwtId is null ? null
            : await _db.UserSessions.FirstOrDefaultAsync(s => s.JwtId == jwtId);

        if (session is not null)
        {
            session.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        var unitPermissions = await _permissionResolver.ResolveAsync(user.Id);
        return Ok(BuildResponse(string.Empty, user, unitPermissions, session?.ExpiresAt ?? DateTime.UtcNow));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var jwtId = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
        if (jwtId is not null) await _session.RevokeAsync(jwtId);
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static AuthResponse BuildResponse(
        string token, AppUser user,
        IList<UnitPermissionSet> unitPermissions, DateTime expiresAt) =>
        new(
            token,
            user.FirstName,
            user.LastName,
            user.FullName,
            user.Email!,
            user.Status,
            user.ForcePasswordChange,
            unitPermissions.Select(u => new UnitAccessDto(
                u.UnitId, u.UnitName, u.RoleName, u.Permissions)).ToList(),
            expiresAt
        );

    private static string FormatUntil(DateTime? until) =>
        until.HasValue ? $" até {until.Value:dd/MM/yyyy HH:mm}" : string.Empty;
}
