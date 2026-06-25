using Demo.Server.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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

        builder.Entity<UserUnit>()
            .HasKey(uu => new { uu.UserId, uu.UnitId });

        builder.Entity<UserUnit>()
            .HasOne(uu => uu.User)
            .WithMany(u => u.UserUnits)
            .HasForeignKey(uu => uu.UserId);

        builder.Entity<UserUnit>()
            .HasOne(uu => uu.Unit)
            .WithMany(u => u.UserUnits)
            .HasForeignKey(uu => uu.UnitId);

        builder.Entity<FinancialEntry>()
            .Property(e => e.Amount)
            .HasPrecision(18, 2);

        builder.Entity<AccountPayable>()
            .Property(a => a.Amount)
            .HasPrecision(18, 2);

        builder.Entity<AccountPayable>()
            .Property(a => a.PaidAmount)
            .HasPrecision(18, 2);

        builder.Entity<AccountReceivable>()
            .Property(a => a.ExpectedAmount)
            .HasPrecision(18, 2);

        builder.Entity<AccountReceivable>()
            .Property(a => a.ReceivedAmount)
            .HasPrecision(18, 2);

        builder.Entity<Budget>()
            .Property(b => b.TotalAmount)
            .HasPrecision(18, 2);

        builder.Entity<Budget>()
            .Property(b => b.UsedAmount)
            .HasPrecision(18, 2);

        builder.Entity<Budget>()
            .Ignore(b => b.AvailableAmount);

        builder.Entity<Purchase>()
            .Property(p => p.Amount)
            .HasPrecision(18, 2);

        // Rename Identity tables to cleaner names
        builder.Entity<AppUser>().ToTable("Users");
        builder.Entity<IdentityRole<Guid>>().ToTable("Roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
    }
}
