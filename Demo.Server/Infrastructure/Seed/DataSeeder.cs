using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Infrastructure.Seed;

public static class DataSeeder
{
    private static readonly Guid UnitCentroId = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid UnitSulId    = Guid.Parse("11111111-0000-0000-0000-000000000002");

    private static readonly Guid UserAdminId      = Guid.Parse("22222222-0000-0000-0000-000000000001");
    private static readonly Guid UserFinCentroId  = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid UserFinSulId     = Guid.Parse("22222222-0000-0000-0000-000000000003");
    private static readonly Guid UserSocioId      = Guid.Parse("22222222-0000-0000-0000-000000000004");
    private static readonly Guid UserComprasId    = Guid.Parse("22222222-0000-0000-0000-000000000005");

    private static readonly Guid CatVendasId      = Guid.Parse("33333333-0000-0000-0000-000000000001");
    private static readonly Guid CatFreteId       = Guid.Parse("33333333-0000-0000-0000-000000000002");
    private static readonly Guid CatAluguelId     = Guid.Parse("33333333-0000-0000-0000-000000000003");
    private static readonly Guid CatFolhaId       = Guid.Parse("33333333-0000-0000-0000-000000000004");
    private static readonly Guid CatFornecedorId  = Guid.Parse("33333333-0000-0000-0000-000000000005");
    private static readonly Guid CatMarketingId   = Guid.Parse("33333333-0000-0000-0000-000000000006");
    private static readonly Guid CatOutrosId      = Guid.Parse("33333333-0000-0000-0000-000000000007");

    private static readonly Guid PmDinheiroId = Guid.Parse("44444444-0000-0000-0000-000000000001");
    private static readonly Guid PmPixId      = Guid.Parse("44444444-0000-0000-0000-000000000002");
    private static readonly Guid PmDebitoId   = Guid.Parse("44444444-0000-0000-0000-000000000003");
    private static readonly Guid PmCreditoId  = Guid.Parse("44444444-0000-0000-0000-000000000004");
    private static readonly Guid PmBoletoId   = Guid.Parse("44444444-0000-0000-0000-000000000005");

    private static readonly Guid ScBalcaoId   = Guid.Parse("55555555-0000-0000-0000-000000000001");
    private static readonly Guid ScDeliveryId = Guid.Parse("55555555-0000-0000-0000-000000000002");
    private static readonly Guid ScIfoodId    = Guid.Parse("55555555-0000-0000-0000-000000000003");
    private static readonly Guid ScZeId       = Guid.Parse("55555555-0000-0000-0000-000000000004");

    private const string RoleAdmin     = "Admin";
    private const string RoleFinancial = "Financial";
    private const string RolePurchases = "Purchases";
    private const string RolePartner   = "Partner";

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        if (await db.Units.AnyAsync()) return;

        await SeedRoles(roleManager);
        await SeedUnits(db);
        await SeedCategories(db);
        await SeedPaymentMethods(db);
        await SeedSalesChannels(db);
        await db.SaveChangesAsync();

        await SeedUsers(userManager, db);
        await SeedFinancialHistory(db);
        await SeedAccountsPayable(db);
        await SeedAccountsReceivable(db);
        await SeedBudgetsAndPurchases(db);
        await SeedAlerts(db);
        await db.SaveChangesAsync();
    }

    private static async Task SeedRoles(RoleManager<IdentityRole<Guid>> roleManager)
    {
        foreach (var role in new[] { RoleAdmin, RoleFinancial, RolePurchases, RolePartner })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }
    }

    private static async Task SeedUnits(AppDbContext db)
    {
        db.Units.AddRange(
            new Unit { Id = UnitCentroId, Name = "Loja Centro", Identifier = "CENTRO", Status = UnitStatus.Active },
            new Unit { Id = UnitSulId,    Name = "Loja Sul",    Identifier = "SUL",    Status = UnitStatus.Active }
        );
        await Task.CompletedTask;
    }

    private static async Task SeedCategories(AppDbContext db)
    {
        db.FinancialCategories.AddRange(
            new FinancialCategory { Id = CatVendasId,     Name = "Venda de Bebidas" },
            new FinancialCategory { Id = CatFreteId,      Name = "Frete" },
            new FinancialCategory { Id = CatAluguelId,    Name = "Aluguel" },
            new FinancialCategory { Id = CatFolhaId,      Name = "Folha de Pagamento" },
            new FinancialCategory { Id = CatFornecedorId, Name = "Fornecedor" },
            new FinancialCategory { Id = CatMarketingId,  Name = "Marketing" },
            new FinancialCategory { Id = CatOutrosId,     Name = "Outros" }
        );
        await Task.CompletedTask;
    }

    private static async Task SeedPaymentMethods(AppDbContext db)
    {
        db.PaymentMethods.AddRange(
            new PaymentMethod { Id = PmDinheiroId, Name = "Dinheiro" },
            new PaymentMethod { Id = PmPixId,      Name = "PIX" },
            new PaymentMethod { Id = PmDebitoId,   Name = "Cartão Débito" },
            new PaymentMethod { Id = PmCreditoId,  Name = "Cartão Crédito" },
            new PaymentMethod { Id = PmBoletoId,   Name = "Boleto" }
        );
        await Task.CompletedTask;
    }

    private static async Task SeedSalesChannels(AppDbContext db)
    {
        db.SalesChannels.AddRange(
            new SalesChannel { Id = ScBalcaoId,   Name = "Balcão" },
            new SalesChannel { Id = ScDeliveryId, Name = "Delivery" },
            new SalesChannel { Id = ScIfoodId,    Name = "iFood" },
            new SalesChannel { Id = ScZeId,       Name = "Zé Delivery" }
        );
        await Task.CompletedTask;
    }

    private static async Task SeedUsers(UserManager<AppUser> userManager, AppDbContext db)
    {
        var users = new[]
        {
            (Id: UserAdminId,     Name: "Administrador",        Email: "admin@demo.com",      Role: RoleAdmin,     Units: new[] { UnitCentroId, UnitSulId }),
            (Id: UserFinCentroId, Name: "Financeiro Centro",    Email: "fin.centro@demo.com", Role: RoleFinancial, Units: new[] { UnitCentroId }),
            (Id: UserFinSulId,    Name: "Financeiro Sul",       Email: "fin.sul@demo.com",    Role: RoleFinancial, Units: new[] { UnitSulId }),
            (Id: UserSocioId,     Name: "Sócio",                Email: "socio@demo.com",      Role: RolePartner,   Units: new[] { UnitCentroId, UnitSulId }),
            (Id: UserComprasId,   Name: "Responsável Compras",  Email: "compras@demo.com",    Role: RolePurchases, Units: new[] { UnitCentroId, UnitSulId }),
        };

        foreach (var (id, name, email, role, units) in users)
        {
            var user = new AppUser
            {
                Id       = id,
                FullName = name,
                Email    = email,
                UserName = email,
                IsActive = true
            };

            await userManager.CreateAsync(user, "Demo@123");
            await userManager.AddToRoleAsync(user, role);

            db.UserUnits.AddRange(units.Select(uid => new UserUnit { UserId = id, UnitId = uid }));
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedFinancialHistory(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var entries = new List<FinancialEntry>();
        var rng = new Random(42);

        // 6 months of revenue entries per unit
        foreach (var (unitId, baseRevenue) in new[] { (UnitCentroId, 28000m), (UnitSulId, 21000m) })
        {
            for (int m = 5; m >= 0; m--)
            {
                var month = today.AddMonths(-m);

                // Revenue by sales channel (4 entries per month)
                var channels = new[] { (ScBalcaoId, 0.40m), (ScDeliveryId, 0.25m), (ScIfoodId, 0.20m), (ScZeId, 0.15m) };
                foreach (var (channelId, pct) in channels)
                {
                    var amount = Math.Round(baseRevenue * pct * (1 + (decimal)(rng.NextDouble() * 0.1 - 0.05)), 2);
                    entries.Add(new FinancialEntry
                    {
                        Id              = Guid.NewGuid(),
                        Description     = $"Vendas {GetChannelName(channelId)} — {month:MMM/yyyy}",
                        Amount          = amount,
                        Type            = FinancialEntryType.Revenue,
                        Date            = new DateOnly(month.Year, month.Month, rng.Next(1, 28)),
                        UnitId          = unitId,
                        CategoryId      = CatVendasId,
                        PaymentMethodId = PmPixId,
                        SalesChannelId  = channelId
                    });
                }

                // Expenses (3-4 per month)
                var expenses = new[]
                {
                    (CatFornecedorId, "Compra de estoque",       baseRevenue * 0.35m),
                    (CatFreteId,      "Frete e logística",        baseRevenue * 0.05m),
                    (CatMarketingId,  "Marketing e divulgação",   baseRevenue * 0.03m),
                };

                foreach (var (catId, desc, baseAmt) in expenses)
                {
                    var amount = Math.Round(baseAmt * (1 + (decimal)(rng.NextDouble() * 0.15 - 0.075)), 2);
                    entries.Add(new FinancialEntry
                    {
                        Id              = Guid.NewGuid(),
                        Description     = $"{desc} — {month:MMM/yyyy}",
                        Amount          = amount,
                        Type            = FinancialEntryType.Expense,
                        Date            = new DateOnly(month.Year, month.Month, rng.Next(1, 28)),
                        UnitId          = unitId,
                        CategoryId      = catId,
                        PaymentMethodId = PmBoletoId
                    });
                }
            }
        }

        db.FinancialEntries.AddRange(entries);
        await Task.CompletedTask;
    }

    private static async Task SeedAccountsPayable(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var payables = new List<AccountPayable>();

        // Recurring monthly bills for both units
        foreach (var unitId in new[] { UnitCentroId, UnitSulId })
        {
            var baseRent = unitId == UnitCentroId ? 4500m : 3200m;

            // Paid last 2 months
            for (int m = 2; m >= 1; m--)
            {
                var due = today.AddMonths(-m).WithDay(5);
                payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Aluguel",            Amount = baseRent,  DueDate = due, PaidDate = due.AddDays(2), PaidAmount = baseRent,  Status = AccountPayableStatus.Paid,    UnitId = unitId, CategoryId = CatAluguelId,  PaymentMethodId = PmBoletoId });
                payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Folha de Pagamento", Amount = 8200m,     DueDate = due.WithDay(1), PaidDate = due.WithDay(1), PaidAmount = 8200m, Status = AccountPayableStatus.Paid, UnitId = unitId, CategoryId = CatFolhaId,   PaymentMethodId = PmPixId });
            }

            // Current month — pending
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Aluguel",            Amount = baseRent, DueDate = today.WithDay(5),  Status = AccountPayableStatus.Pending, UnitId = unitId, CategoryId = CatAluguelId,  PaymentMethodId = PmBoletoId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Folha de Pagamento", Amount = 8200m,    DueDate = today.WithDay(1),  Status = AccountPayableStatus.Paid,    PaidDate = today.WithDay(1), PaidAmount = 8200m, UnitId = unitId, CategoryId = CatFolhaId, PaymentMethodId = PmPixId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Fornecedor Bebidas", Amount = 12400m,   DueDate = today.AddDays(3),  Status = AccountPayableStatus.Pending, UnitId = unitId, CategoryId = CatFornecedorId, PaymentMethodId = PmBoletoId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Serviço de Marketing", Amount = 1800m, DueDate = today.AddDays(7),  Status = AccountPayableStatus.Pending, UnitId = unitId, CategoryId = CatMarketingId, PaymentMethodId = PmPixId });

            // Overdue
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Energia Elétrica",   Amount = 920m,   DueDate = today.AddDays(-5), Status = AccountPayableStatus.Overdue,  UnitId = unitId, CategoryId = CatOutrosId, PaymentMethodId = PmBoletoId });
        }

        db.AccountsPayable.AddRange(payables);
        await Task.CompletedTask;
    }

    private static async Task SeedAccountsReceivable(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var receivables = new List<AccountReceivable>();

        foreach (var unitId in new[] { UnitCentroId, UnitSulId })
        {
            // Already received
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse iFood",      ExpectedAmount = 8400m,  ReceivedAmount = 8400m,  ExpectedDate = today.AddMonths(-1).WithDay(15), ReceivedDate = today.AddMonths(-1).WithDay(16), Status = AccountReceivableStatus.Received, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse Zé Delivery", ExpectedAmount = 6200m, ReceivedAmount = 6200m,  ExpectedDate = today.AddMonths(-1).WithDay(20), ReceivedDate = today.AddMonths(-1).WithDay(21), Status = AccountReceivableStatus.Received, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });

            // Pending this month
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse iFood",       ExpectedAmount = 8900m,  ExpectedDate = today.AddDays(5),  Status = AccountReceivableStatus.Pending, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse Zé Delivery", ExpectedAmount = 6500m,  ExpectedDate = today.AddDays(8),  Status = AccountReceivableStatus.Pending, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Crédito de Frete",    ExpectedAmount = 1200m,  ExpectedDate = today.AddDays(12), Status = AccountReceivableStatus.Pending, UnitId = unitId, CategoryId = CatFreteId,  PaymentMethodId = PmPixId });

            // Overdue
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Acerto de caixa cliente", ExpectedAmount = 3400m, ExpectedDate = today.AddDays(-3), Status = AccountReceivableStatus.Overdue, UnitId = unitId, CategoryId = CatOutrosId, PaymentMethodId = PmDinheiroId });
        }

        db.AccountsReceivable.AddRange(receivables);
        await Task.CompletedTask;
    }

    private static async Task SeedBudgetsAndPurchases(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var budgets = new List<Budget>();
        var purchases = new List<Purchase>();

        foreach (var (unitId, totalBudget) in new[] { (UnitCentroId, 35000m), (UnitSulId, 26000m) })
        {
            // Last 2 months — closed budgets
            for (int m = 2; m >= 1; m--)
            {
                var month = DateTime.Today.AddMonths(-m);
                var used  = Math.Round(totalBudget * 0.88m, 2);
                var b = new Budget
                {
                    Id          = Guid.NewGuid(),
                    Description = $"Verba {month:MMM/yyyy}",
                    TotalAmount = totalBudget,
                    UsedAmount  = used,
                    Month       = month.Month,
                    Year        = month.Year,
                    Status      = BudgetStatus.Closed,
                    UnitId      = unitId
                };
                budgets.Add(b);

                purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Estoque mensal",      Amount = Math.Round(totalBudget * 0.55m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatFornecedorId, BudgetId = b.Id, DueDate = new DateOnly(month.Year, month.Month, 10) });
                purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Frete e distribuição", Amount = Math.Round(totalBudget * 0.18m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatFreteId,      BudgetId = b.Id, DueDate = new DateOnly(month.Year, month.Month, 15) });
                purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Marketing mensal",     Amount = Math.Round(totalBudget * 0.15m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatMarketingId,  BudgetId = b.Id, DueDate = new DateOnly(month.Year, month.Month, 20) });
            }

            // Current month — active budget, partially used
            var curUsed = Math.Round(totalBudget * 0.42m, 2);
            var current = new Budget
            {
                Id          = Guid.NewGuid(),
                Description = $"Verba {DateTime.Today:MMM/yyyy}",
                TotalAmount = totalBudget,
                UsedAmount  = curUsed,
                Month       = DateTime.Today.Month,
                Year        = DateTime.Today.Year,
                Status      = BudgetStatus.Active,
                UnitId      = unitId
            };
            budgets.Add(current);

            purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Estoque quinzenal",      Amount = Math.Round(totalBudget * 0.28m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatFornecedorId, BudgetId = current.Id, DueDate = today.AddDays(5) });
            purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Campanha redes sociais", Amount = Math.Round(totalBudget * 0.08m, 2), Status = PurchaseStatus.Intended,  UnitId = unitId, CategoryId = CatMarketingId,  BudgetId = current.Id, DueDate = today.AddDays(10) });
            purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Frete próxima semana",   Amount = Math.Round(totalBudget * 0.06m, 2), Status = PurchaseStatus.Intended,  UnitId = unitId, CategoryId = CatFreteId,      BudgetId = current.Id, DueDate = today.AddDays(7) });
        }

        db.Budgets.AddRange(budgets);
        db.Purchases.AddRange(purchases);
        await Task.CompletedTask;
    }

    private static async Task SeedAlerts(AppDbContext db)
    {
        var today = DateTime.UtcNow;
        db.Alerts.AddRange(
            new Alert { Id = Guid.NewGuid(), Type = AlertType.UpcomingDue,     Message = "Aluguel Loja Centro vence em 5 dias",             UnitId = UnitCentroId, CreatedAt = today },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.UpcomingDue,     Message = "Fornecedor Bebidas vence em 3 dias (Loja Centro)", UnitId = UnitCentroId, CreatedAt = today },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.OverduePayable,  Message = "Energia Elétrica vencida há 5 dias — Loja Centro", UnitId = UnitCentroId, CreatedAt = today },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.UpcomingDue,     Message = "Aluguel Loja Sul vence em 5 dias",                UnitId = UnitSulId,    CreatedAt = today },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.OverduePayable,  Message = "Energia Elétrica vencida há 5 dias — Loja Sul",   UnitId = UnitSulId,    CreatedAt = today },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.LowBudget,       Message = "Verba da Loja Sul está com 58% utilizado",         UnitId = UnitSulId,    CreatedAt = today }
        );
        await Task.CompletedTask;
    }

    private static string GetChannelName(Guid channelId) => channelId switch
    {
        var id when id == ScBalcaoId   => "Balcão",
        var id when id == ScDeliveryId => "Delivery",
        var id when id == ScIfoodId    => "iFood",
        var id when id == ScZeId       => "Zé Delivery",
        _                              => "Canal"
    };
}

file static class DateOnlyExtensions
{
    public static DateOnly WithDay(this DateOnly date, int day) =>
        new(date.Year, date.Month, Math.Min(day, DateTime.DaysInMonth(date.Year, date.Month)));
}
