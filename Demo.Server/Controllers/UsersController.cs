using Demo.Server.Application.DTOs.Users;
using Demo.Server.Domain.Entities;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;

    public UsersController(UserManager<AppUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db          = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userManager.Users
            .Include(u => u.UserUnits)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new UserDto(u.Id, u.FullName, u.Email!, roles.FirstOrDefault() ?? "", u.IsActive,
                u.UserUnits.Select(uu => uu.UnitId).ToList(), u.CreatedAt));
        }

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userManager.Users
            .Include(u => u.UserUnits)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new UserDto(user.Id, user.FullName, user.Email!, roles.FirstOrDefault() ?? "", user.IsActive,
            user.UserUnits.Select(uu => uu.UnitId).ToList(), user.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var user = new AppUser
        {
            Id       = Guid.NewGuid(),
            FullName = request.FullName,
            Email    = request.Email,
            UserName = request.Email,
            IsActive = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, request.Role);

        _db.UserUnits.AddRange(request.UnitIds.Select(uid => new UserUnit { UserId = user.Id, UnitId = uid }));
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id },
            new UserDto(user.Id, user.FullName, user.Email!, request.Role, true, request.UnitIds, user.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userManager.Users.Include(u => u.UserUnits).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        user.FullName = request.FullName;
        user.IsActive = request.IsActive;
        await _userManager.UpdateAsync(user);

        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        await _userManager.AddToRoleAsync(user, request.Role);

        _db.UserUnits.RemoveRange(user.UserUnits);
        _db.UserUnits.AddRange(request.UnitIds.Select(uid => new UserUnit { UserId = user.Id, UnitId = uid }));
        await _db.SaveChangesAsync();

        return Ok(new UserDto(user.Id, user.FullName, user.Email!, request.Role, user.IsActive, request.UnitIds, user.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }
}
