using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Demo.Server.Infrastructure.Identity;

public class JwtService : IJwtService
{
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> settings) => _settings = settings.Value;

    public string GenerateToken(AppUser user, IList<string> roles, IList<Guid> unitIds)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Name,  user.FullName),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(unitIds.Select(id => new Claim("unitId", id.ToString())));

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            expires:            GetExpiration(),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public DateTime GetExpiration() =>
        DateTime.UtcNow.AddHours(_settings.ExpirationInHours);
}
