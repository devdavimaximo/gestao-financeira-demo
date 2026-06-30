using Demo.Server.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace Demo.Server.Domain.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Notes { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public bool ForcePasswordChange { get; set; }
    public DateTime? PasswordExpiresAt { get; set; }
    public int? MaxLoginAttempts { get; set; }
    public DateTime? BlockedUntil { get; set; }
    public bool IsSystemUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; set; }

    public ICollection<UserUnit> UserUnits { get; set; } = [];
    public ICollection<UserUnitPermission> UserUnitPermissions { get; set; } = [];
    public ICollection<UserSession> Sessions { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}
