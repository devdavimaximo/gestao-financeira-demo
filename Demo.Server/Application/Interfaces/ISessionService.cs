namespace Demo.Server.Application.Interfaces;

public interface ISessionService
{
    Task RevokeAsync(string jwtId);
    Task RevokeAllForUserAsync(Guid userId);
}
