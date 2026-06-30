using System.Text.Json;
using Demo.Server.Application.Interfaces;
using Demo.Server.Domain.Entities;
using Demo.Server.Infrastructure.Persistence;

namespace Demo.Server.Infrastructure.Identity;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private static readonly JsonSerializerOptions _jsonOpts = new() { WriteIndented = false };

    public AuditService(AppDbContext db) => _db = db;

    public async Task LogAsync(
        string action, string entityType, string? entityId = null,
        object? before = null, object? after = null,
        Guid? actorUserId = null, string? ipAddress = null, string? userAgent = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id          = Guid.NewGuid(),
            Action      = action,
            EntityType  = entityType,
            EntityId    = entityId,
            Before      = before is null ? null : JsonSerializer.Serialize(before, _jsonOpts),
            After       = after  is null ? null : JsonSerializer.Serialize(after,  _jsonOpts),
            ActorUserId = actorUserId,
            IpAddress   = ipAddress,
            UserAgent   = userAgent,
            CreatedAt   = DateTime.UtcNow
        });
        // Caller is responsible for SaveChangesAsync so the audit entry
        // is persisted in the same transaction as the primary operation.
    }
}
