namespace Demo.Server.Application.Interfaces;

/// <summary>
/// Appends an entry to the AuditLog change tracker.
/// The caller MUST call SaveChangesAsync afterwards to persist the entry.
/// This allows batching the audit log with the primary operation in a single transaction.
/// </summary>
public interface IAuditService
{
    Task LogAsync(string action, string entityType, string? entityId = null,
        object? before = null, object? after = null,
        Guid? actorUserId = null, string? ipAddress = null, string? userAgent = null);
}
