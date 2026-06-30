using Demo.Server.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Infrastructure.Persistence;

public class AppDbContext : IdentityUserContext<AppUser, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Auth entities
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserUnitPermission> UserUnitPermissions => Set<UserUnitPermission>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    // Business entities
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<UserUnit> UserUnits => Set<UserUnit>();
    public DbSet<FinancialCategory> FinancialCategories => Set<FinancialCategory>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<SalesChannel> SalesChannels => Set<SalesChannel>();
    public DbSet<FinancialEntry> FinancialEntries => Set<FinancialEntry>();
    public DbSet<AccountPayable> AccountsPayable => Set<AccountPayable>();
    public DbSet<AccountReceivable> AccountsReceivable => Set<AccountReceivable>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity tables
        builder.Entity<AppUser>().ToTable("Users");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");

        // AppUser computed property
        builder.Entity<AppUser>().Ignore(u => u.FullName);

        // UserUnit — composite PK, FK to custom Role
        builder.Entity<UserUnit>().HasKey(uu => new { uu.UserId, uu.UnitId });
        builder.Entity<UserUnit>()
            .HasOne(uu => uu.User).WithMany(u => u.UserUnits).HasForeignKey(uu => uu.UserId);
        builder.Entity<UserUnit>()
            .HasOne(uu => uu.Unit).WithMany(u => u.UserUnits).HasForeignKey(uu => uu.UnitId);
        builder.Entity<UserUnit>()
            .HasOne(uu => uu.Role).WithMany(r => r.UserUnits).HasForeignKey(uu => uu.RoleId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<UserUnit>()
            .HasIndex(uu => new { uu.UserId, uu.UnitId });

        // RolePermission — composite PK
        builder.Entity<RolePermission>().HasKey(rp => new { rp.RoleId, rp.PermissionId });
        builder.Entity<RolePermission>()
            .HasOne(rp => rp.Role).WithMany(r => r.RolePermissions).HasForeignKey(rp => rp.RoleId);
        builder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission).WithMany(p => p.RolePermissions).HasForeignKey(rp => rp.PermissionId);

        // UserUnitPermission — composite PK
        builder.Entity<UserUnitPermission>().HasKey(p => new { p.UserId, p.UnitId, p.PermissionId });
        builder.Entity<UserUnitPermission>()
            .HasOne(p => p.User).WithMany(u => u.UserUnitPermissions).HasForeignKey(p => p.UserId);
        builder.Entity<UserUnitPermission>()
            .HasOne(p => p.Unit).WithMany().HasForeignKey(p => p.UnitId);
        builder.Entity<UserUnitPermission>()
            .HasOne(p => p.Permission).WithMany(p => p.UserUnitPermissions).HasForeignKey(p => p.PermissionId);
        builder.Entity<UserUnitPermission>()
            .HasIndex(p => new { p.UserId, p.UnitId });

        // Permission — unique Code, belongs to Module
        builder.Entity<Permission>()
            .HasOne(p => p.Module).WithMany(m => m.Permissions).HasForeignKey(p => p.ModuleId);
        builder.Entity<Permission>()
            .HasIndex(p => p.Code).IsUnique();

        // Module
        builder.Entity<Module>()
            .HasIndex(m => m.Code).IsUnique();

        // Role
        builder.Entity<Role>()
            .HasIndex(r => r.Name).IsUnique();

        // AuditLog
        builder.Entity<AuditLog>()
            .HasOne(a => a.ActorUser).WithMany(u => u.AuditLogs)
            .HasForeignKey(a => a.ActorUserId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.Entity<AuditLog>()
            .HasIndex(a => new { a.EntityType, a.EntityId });
        builder.Entity<AuditLog>()
            .HasIndex(a => a.ActorUserId);

        // UserSession
        builder.Entity<UserSession>()
            .HasOne(s => s.User).WithMany(u => u.Sessions).HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<UserSession>()
            .HasIndex(s => s.JwtId).IsUnique();
        builder.Entity<UserSession>()
            .HasIndex(s => new { s.UserId, s.IsRevoked });

        // Financial precision
        builder.Entity<FinancialEntry>().Property(e => e.Amount).HasPrecision(18, 2);
        builder.Entity<AccountPayable>().Property(a => a.Amount).HasPrecision(18, 2);
        builder.Entity<AccountPayable>().Property(a => a.PaidAmount).HasPrecision(18, 2);
        builder.Entity<AccountReceivable>().Property(a => a.ExpectedAmount).HasPrecision(18, 2);
        builder.Entity<AccountReceivable>().Property(a => a.ReceivedAmount).HasPrecision(18, 2);
        builder.Entity<Budget>().Property(b => b.TotalAmount).HasPrecision(18, 2);
        builder.Entity<Budget>().Property(b => b.UsedAmount).HasPrecision(18, 2);
        builder.Entity<Budget>().Ignore(b => b.AvailableAmount);
        builder.Entity<Purchase>().Property(p => p.Amount).HasPrecision(18, 2);
    }
}
