using Demo.Server.Application.Interfaces;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Infrastructure.Identity;

public class SessionService(AppDbContext db) : ISessionService
{
    public async Task RevokeAsync(string jwtId)
    {
        var session = await db.UserSessions.FirstOrDefaultAsync(s => s.JwtId == jwtId);
        if (session is null) return;
        session.IsRevoked = true;
        await db.SaveChangesAsync();
    }

    public async Task RevokeAllForUserAsync(Guid userId)
    {
        var sessions = await db.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ToListAsync();
        if (sessions.Count == 0) return;
        foreach (var s in sessions) s.IsRevoked = true;
        await db.SaveChangesAsync();
    }
}
