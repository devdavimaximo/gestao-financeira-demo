using Microsoft.AspNetCore.Identity;

namespace Demo.Server.Domain.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserUnit> UserUnits { get; set; } = [];
}
