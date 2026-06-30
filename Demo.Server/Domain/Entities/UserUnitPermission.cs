namespace Demo.Server.Domain.Entities;

public class UserUnitPermission
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;

    public bool IsGranted { get; set; }
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public Guid? GrantedByUserId { get; set; }
}
