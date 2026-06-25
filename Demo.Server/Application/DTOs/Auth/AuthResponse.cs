namespace Demo.Server.Application.DTOs.Auth;

public record AuthResponse(
    string Token,
    string FullName,
    string Email,
    string Role,
    IList<Guid> UnitIds,
    DateTime ExpiresAt
);
