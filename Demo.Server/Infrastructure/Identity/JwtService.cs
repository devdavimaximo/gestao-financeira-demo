using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Demo.Server.Infrastructure.Identity;

public class JwtService : IJwtService
{
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> settings) => _settings = settings.Value;

    public (string Token, string JwtId, DateTime ExpiresAt) GenerateToken(
        AppUser user, IList<UnitPermissionSet> unitPermissions)
    {
        var jwtId   = Guid.NewGuid().ToString();
        var expires = DateTime.UtcNow.AddHours(_settings.ExpirationInHours);

        var unitsClaim = JsonSerializer.Serialize(unitPermissions.Select(u => new
        {
            unitId   = u.UnitId,
            unitName = u.UnitName,
            roleName = u.RoleName,
            perms    = u.Permissions
        }));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Name,  user.FullName),
            new(JwtRegisteredClaimNames.Jti,   jwtId),
            new("status",                      user.Status.ToString()),
            new("units",                       unitsClaim),
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            expires:            expires,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), jwtId, expires);
    }
}
