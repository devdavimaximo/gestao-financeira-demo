namespace Demo.Server.Domain.Entities;

public class UserUnit
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;
}
