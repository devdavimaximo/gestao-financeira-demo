using System.ComponentModel.DataAnnotations;
using Demo.Server.Domain.Enums;

namespace Demo.Server.Application.DTOs.Admin;

// ─── Users ───────────────────────────────────────────────────────────────────

public record AdminUserListItemDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? Phone,
    string? Position,
    string? AvatarUrl,
    UserStatus Status,
    bool ForcePasswordChange,
    DateTime CreatedAt,
    DateTime? LastSeenAt,
    IList<UserUnitRoleDto> Units
);

public record UserUnitRoleDto(
    Guid UnitId,
    string UnitName,
    Guid RoleId,
    string RoleName
);

public record AdminUserDetailDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? Phone,
    string? Position,
    string? AvatarUrl,
    string? Notes,
    UserStatus Status,
    bool ForcePasswordChange,
    bool IsSystemUser,
    DateTime CreatedAt,
    Guid? CreatedByUserId,
    IList<UserUnitRoleDto> Units
);

public record AdminCreateUserRequest(
    [Required, MaxLength(100)] string FirstName,
    [Required, MaxLength(100)] string LastName,
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? Position,
    [MaxLength(500)] string? AvatarUrl,
    [MaxLength(2000)] string? Notes,
    UserStatus Status,
    bool ForcePasswordChange,
    IList<UserUnitAssignmentRequest> Units
);

public record AdminUpdateUserRequest(
    [Required, MaxLength(100)] string FirstName,
    [Required, MaxLength(100)] string LastName,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? Position,
    [MaxLength(500)] string? AvatarUrl,
    [MaxLength(2000)] string? Notes
);

public record UserUnitAssignmentRequest(Guid UnitId, Guid RoleId);

public record AdminUpdateUserUnitsRequest(IList<UserUnitAssignmentRequest> Units);

public record AdminBlockUserRequest([MaxLength(500)] string? Reason);

public record AdminSuspendUserRequest(DateTime BlockedUntil, [MaxLength(500)] string? Reason);

public record AdminResetPasswordRequest(
    [Required, MinLength(8), MaxLength(100)] string NewPassword
);

public record AdminUserPermissionsDto(
    Guid UnitId,
    string UnitName,
    string RoleName,
    IList<string> RolePermissions,
    IList<PermissionOverrideDto> Overrides
);

public record PermissionOverrideDto(
    Guid PermissionId,
    string Code,
    string Name,
    bool IsGranted
);

public record AdminUpdatePermissionsRequest(IList<PermissionOverrideRequest> Overrides);

public record PermissionOverrideRequest(Guid PermissionId, bool IsGranted);

// ─── Roles ───────────────────────────────────────────────────────────────────

public record AdminRoleListItemDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsSystem,
    bool IsActive,
    int UserCount,
    DateTime CreatedAt
);

public record AdminRoleDetailDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsSystem,
    bool IsActive,
    IList<string> PermissionCodes
);

public record AdminCreateRoleRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(500)] string? Description,
    IList<string> PermissionCodes
);

public record AdminUpdateRoleRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(500)] string? Description,
    bool IsActive,
    IList<string> PermissionCodes
);

// ─── Modules / Permissions ───────────────────────────────────────────────────

public record AdminModuleDto(
    Guid Id,
    string Code,
    string Name,
    string? Icon,
    int DisplayOrder,
    IList<AdminPermissionDto> Permissions
);

public record AdminPermissionDto(
    Guid Id,
    string Code,
    string Name,
    int DisplayOrder
);

// ─── Audit ───────────────────────────────────────────────────────────────────

public record AdminAuditLogDto(
    Guid Id,
    Guid? ActorUserId,
    string? ActorFullName,
    string Action,
    string EntityType,
    string? EntityId,
    string? Before,
    string? After,
    string? IpAddress,
    string? UserAgent,
    DateTime CreatedAt
);

// ─── Sessions ────────────────────────────────────────────────────────────────

public record AdminSessionDto(
    Guid Id,
    Guid UserId,
    string UserFullName,
    string? IpAddress,
    string? UserAgent,
    bool IsRevoked,
    DateTime LastSeenAt,
    DateTime ExpiresAt,
    DateTime CreatedAt
);

// ─── Timeline ────────────────────────────────────────────────────────────────

public record UserTimelineEventDto(
    Guid Id,
    string Action,
    string? ActorFullName,
    string? EntityId,
    string? Detail,
    string? IpAddress,
    DateTime CreatedAt
);
