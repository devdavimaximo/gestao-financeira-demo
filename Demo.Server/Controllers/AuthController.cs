using Demo.Server.Application.DTOs.Auth;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Entities;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly IJwtService _jwtService;
    private readonly AppDbContext _db;

    public AuthController(UserManager<AppUser> userManager, SignInManager<AppUser> signInManager, IJwtService jwtService, AppDbContext db)
    {
        _userManager  = userManager;
        _signInManager = signInManager;
        _jwtService   = jwtService;
        _db           = db;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "E-mail ou senha inválidos." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded)
            return Unauthorized(new { message = "E-mail ou senha inválidos." });

        var roles   = await _userManager.GetRolesAsync(user);
        var unitIds = await _db.UserUnits
            .Where(uu => uu.UserId == user.Id)
            .Select(uu => uu.UnitId)
            .ToListAsync();

        var token     = _jwtService.GenerateToken(user, roles, unitIds);
        var expiresAt = _jwtService.GetExpiration();

        return Ok(new AuthResponse(token, user.FullName, user.Email!, roles.FirstOrDefault() ?? "", unitIds, expiresAt));
    }

    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!.Value);
        var user   = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

        var roles   = await _userManager.GetRolesAsync(user);
        var unitIds = await _db.UserUnits
            .Where(uu => uu.UserId == user.Id)
            .Select(uu => uu.UnitId)
            .ToListAsync();

        return Ok(new AuthResponse("", user.FullName, user.Email!, roles.FirstOrDefault() ?? "", unitIds, DateTime.UtcNow));
    }
}
