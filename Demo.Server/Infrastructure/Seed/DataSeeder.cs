using Demo.Server.Domain.Constants;
using Demo.Server.Domain.Entities;
using Demo.Server.Domain.Enums;
using Demo.Server.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Demo.Server.Infrastructure.Seed;

public static class DataSeeder
{
    // ----- Units -----
    private static readonly Guid UnitCentroId = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid UnitSulId    = Guid.Parse("11111111-0000-0000-0000-000000000002");

    // ----- Users -----
    private static readonly Guid UserAdminId     = Guid.Parse("22222222-0000-0000-0000-000000000001");
    private static readonly Guid UserFinCentroId = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid UserFinSulId    = Guid.Parse("22222222-0000-0000-0000-000000000003");
    private static readonly Guid UserSocioId     = Guid.Parse("22222222-0000-0000-0000-000000000004");
    private static readonly Guid UserComprasId   = Guid.Parse("22222222-0000-0000-0000-000000000005");

    // ----- Categories -----
    private static readonly Guid CatVendasId     = Guid.Parse("33333333-0000-0000-0000-000000000001");
    private static readonly Guid CatFreteId      = Guid.Parse("33333333-0000-0000-0000-000000000002");
    private static readonly Guid CatAluguelId    = Guid.Parse("33333333-0000-0000-0000-000000000003");
    private static readonly Guid CatFolhaId      = Guid.Parse("33333333-0000-0000-0000-000000000004");
    private static readonly Guid CatFornecedorId = Guid.Parse("33333333-0000-0000-0000-000000000005");
    private static readonly Guid CatMarketingId  = Guid.Parse("33333333-0000-0000-0000-000000000006");
    private static readonly Guid CatOutrosId     = Guid.Parse("33333333-0000-0000-0000-000000000007");

    // ----- Payment Methods -----
    private static readonly Guid PmDinheiroId = Guid.Parse("44444444-0000-0000-0000-000000000001");
    private static readonly Guid PmPixId      = Guid.Parse("44444444-0000-0000-0000-000000000002");
    private static readonly Guid PmDebitoId   = Guid.Parse("44444444-0000-0000-0000-000000000003");
    private static readonly Guid PmCreditoId  = Guid.Parse("44444444-0000-0000-0000-000000000004");
    private static readonly Guid PmBoletoId   = Guid.Parse("44444444-0000-0000-0000-000000000005");

    // ----- Sales Channels -----
    private static readonly Guid ScBalcaoId   = Guid.Parse("55555555-0000-0000-0000-000000000001");
    private static readonly Guid ScDeliveryId = Guid.Parse("55555555-0000-0000-0000-000000000002");
    private static readonly Guid ScIfoodId    = Guid.Parse("55555555-0000-0000-0000-000000000003");
    private static readonly Guid ScZeId       = Guid.Parse("55555555-0000-0000-0000-000000000004");

    // ----- Roles -----
    private static readonly Guid RoleSuperAdminId = Guid.Parse("77777777-0000-0000-0000-000000000001");
    private static readonly Guid RoleAdminId      = Guid.Parse("77777777-0000-0000-0000-000000000002");
    private static readonly Guid RoleFinanceiroId = Guid.Parse("77777777-0000-0000-0000-000000000003");
    private static readonly Guid RoleComprasId    = Guid.Parse("77777777-0000-0000-0000-000000000004");
    private static readonly Guid RoleSocioId      = Guid.Parse("77777777-0000-0000-0000-000000000005");
    private static readonly Guid RoleAuditorId    = Guid.Parse("77777777-0000-0000-0000-000000000006");

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        // Always run localization/ordering fix (idempotent)
        await FixPermissionNamesPtAsync(db);

        // Always re-seed alerts if any have missing DueDate (migration added the column)
        await FixAlertDueDatesAsync(db);

        if (await db.Units.AnyAsync()) return;

        var permCodeToId = SeedModulesAndPermissions(db);
        SeedRolesAndPermissions(db, permCodeToId);
        SeedUnits(db);
        SeedCategories(db);
        SeedPaymentMethods(db);
        SeedSalesChannels(db);
        await db.SaveChangesAsync();

        await SeedUsers(userManager, db);
        SeedFinancialHistory(db);
        SeedAccountsPayable(db);
        SeedAccountsReceivable(db);
        SeedBudgetsAndPurchases(db);
        SeedAlerts(db);
        await db.SaveChangesAsync();
    }

    // Re-seeds alerts when DueDate column was added but existing rows still have null.
    private static async Task FixAlertDueDatesAsync(AppDbContext db)
    {
        var hasMissingDueDate = await db.Alerts.AnyAsync(a =>
            (a.Type == AlertType.UpcomingDue || a.Type == AlertType.OverduePayable) && a.DueDate == null);

        if (!hasMissingDueDate) return;

        db.Alerts.RemoveRange(db.Alerts);
        await db.SaveChangesAsync();
        SeedAlerts(db);
        await db.SaveChangesAsync();
    }

    // Translates permission names to PT-BR and fixes display order to match sidebar.
    // Safe to call on every startup — only writes if something differs.
    private static async Task FixPermissionNamesPtAsync(AppDbContext db)
    {
        // Module display order aligned with sidebar (top to bottom)
        var moduleOrder = new Dictionary<string, int>
        {
            ["dashboard"]   =  1,
            ["financial"]   =  2,
            ["alerts"]      =  3,
            ["payables"]    =  4,
            ["receivables"] =  5,
            ["budgets"]     =  6,
            ["cashflow"]    =  7,
            ["purchases"]   =  8,
            ["channels"]    =  9,
            ["calendar"]    = 10,
            ["users"]       = 11,
            ["units"]       = 12,
            ["reports"]     = 13,
            ["settings"]    = 14,
        };

        // Permission name (PT-BR) and display order within its module
        var permMeta = new Dictionary<string, (string Name, int Order)>
        {
            // Dashboard
            ["dashboard:view"]              = ("Visualizar",              1),
            // Financeiro
            ["financial:view"]              = ("Visualizar",              1),
            ["financial:create"]            = ("Lançar",                  2),
            ["financial:edit"]              = ("Editar",                  3),
            ["financial:delete"]            = ("Excluir",                 4),
            ["financial:approve"]           = ("Aprovar",                 5),
            ["financial:reverse"]           = ("Estornar",                6),
            ["financial:export"]            = ("Exportar",                7),
            // Alertas
            ["alerts:view"]                 = ("Visualizar",              1),
            ["alerts:dismiss"]              = ("Dispensar",               2),
            // Contas a Pagar
            ["payables:view"]               = ("Visualizar",              1),
            ["payables:create"]             = ("Lançar",                  2),
            ["payables:edit"]               = ("Editar",                  3),
            ["payables:pay"]                = ("Registrar pagamento",      4),
            ["payables:cancel"]             = ("Cancelar",                5),
            ["payables:export"]             = ("Exportar",                6),
            // Contas a Receber
            ["receivables:view"]            = ("Visualizar",              1),
            ["receivables:create"]          = ("Lançar",                  2),
            ["receivables:edit"]            = ("Editar",                  3),
            ["receivables:receive"]         = ("Registrar recebimento",   4),
            ["receivables:cancel"]          = ("Cancelar",                5),
            ["receivables:export"]          = ("Exportar",                6),
            // Verbas
            ["budgets:view"]                = ("Visualizar",              1),
            ["budgets:create"]              = ("Criar",                   2),
            ["budgets:edit"]                = ("Editar",                  3),
            ["budgets:close"]               = ("Encerrar",                4),
            // Fluxo de Caixa
            ["cashflow:view"]               = ("Visualizar",              1),
            ["cashflow:export"]             = ("Exportar",                2),
            // Compras
            ["purchases:view"]              = ("Visualizar",              1),
            ["purchases:create"]            = ("Solicitar",               2),
            ["purchases:edit"]              = ("Editar",                  3),
            ["purchases:confirm"]           = ("Confirmar",               4),
            ["purchases:cancel"]            = ("Cancelar",                5),
            ["purchases:delete"]            = ("Excluir",                 6),
            // Canais de Venda
            ["channels:view"]               = ("Visualizar",              1),
            ["channels:export"]             = ("Exportar",                2),
            // Calendário
            ["calendar:view"]               = ("Visualizar",              1),
            // Usuários
            ["users:view"]                  = ("Visualizar",              1),
            ["users:create"]                = ("Criar",                   2),
            ["users:edit"]                  = ("Editar",                  3),
            ["users:block"]                 = ("Bloquear / Suspender",    4),
            ["users:reset_password"]        = ("Redefinir senha",         5),
            ["users:manage_permissions"]    = ("Gerenciar permissões",    6),
            ["users:delete"]                = ("Excluir",                 7),
            // Unidades
            ["units:view"]                  = ("Visualizar",              1),
            ["units:create"]                = ("Criar",                   2),
            ["units:edit"]                  = ("Editar",                  3),
            ["units:deactivate"]            = ("Desativar",               4),
            ["units:delete"]                = ("Excluir permanentemente", 5),
            // Relatórios
            ["reports:view"]                = ("Visualizar",              1),
            ["reports:export"]              = ("Exportar",                2),
            ["reports:share"]               = ("Compartilhar",            3),
            // Configurações
            ["settings:view"]               = ("Visualizar",              1),
            ["settings:edit"]               = ("Editar",                  2),
        };

        bool changed = false;

        var modules = await db.Modules.ToListAsync();
        foreach (var mod in modules)
        {
            if (moduleOrder.TryGetValue(mod.Code, out var newOrder) && mod.DisplayOrder != newOrder)
            {
                mod.DisplayOrder = newOrder;
                changed = true;
            }
        }

        var permissions = await db.Permissions.ToListAsync();
        var existingCodes = permissions.Select(p => p.Code).ToHashSet();

        foreach (var perm in permissions)
        {
            if (permMeta.TryGetValue(perm.Code, out var meta))
            {
                if (perm.Name != meta.Name || perm.DisplayOrder != meta.Order)
                {
                    perm.Name         = meta.Name;
                    perm.DisplayOrder = meta.Order;
                    changed           = true;
                }
            }
        }

        // Insert permissions that are in permMeta but missing from the DB
        var moduleByCode = await db.Modules.ToDictionaryAsync(m => m.Code, m => m.Id);
        var existingRolePerms = await db.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync();
        var existingRolePermSet = existingRolePerms
            .Select(rp => (rp.RoleId, rp.PermissionId))
            .ToHashSet();

        foreach (var (code, meta) in permMeta)
        {
            if (existingCodes.Contains(code)) continue;

            var moduleCode = code.Split(':')[0];
            if (!moduleByCode.TryGetValue(moduleCode, out var moduleId)) continue;

            var newPermId = Guid.NewGuid();
            db.Permissions.Add(new Permission
            {
                Id           = newPermId,
                Code         = code,
                Name         = meta.Name,
                DisplayOrder = meta.Order,
                ModuleId     = moduleId,
            });

            // Grant new permissions to all roles that are flagged as system roles
            // (Super Admin and Administrador carry all permissions)
            var systemRoleIds = await db.Roles
                .Where(r => r.IsSystem)
                .Select(r => r.Id)
                .ToListAsync();

            foreach (var roleId in systemRoleIds)
            {
                if (!existingRolePermSet.Contains((roleId, newPermId)))
                {
                    db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = newPermId });
                    existingRolePermSet.Add((roleId, newPermId));
                }
            }

            changed = true;
        }

        if (changed) await db.SaveChangesAsync();
    }

    private static Dictionary<string, Guid> SeedModulesAndPermissions(AppDbContext db)
    {
        var moduleDefs = new[]
        {
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000001"), Code: "dashboard",   Name: "Dashboard",        Icon: "LayoutDashboard",  Order: 1),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000002"), Code: "financial",   Name: "Financeiro",       Icon: "TrendingUp",       Order: 2),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000003"), Code: "payables",    Name: "Contas a Pagar",   Icon: "ArrowUpCircle",    Order: 3),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000004"), Code: "receivables", Name: "Contas a Receber", Icon: "ArrowDownCircle",  Order: 4),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000005"), Code: "budgets",     Name: "Verbas",           Icon: "PieChart",         Order: 5),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000006"), Code: "purchases",   Name: "Compras",          Icon: "ShoppingCart",     Order: 6),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000007"), Code: "cashflow",    Name: "Fluxo de Caixa",   Icon: "BarChart2",        Order: 7),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000008"), Code: "calendar",    Name: "Calendário",       Icon: "Calendar",         Order: 8),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000009"), Code: "channels",    Name: "Canais de Venda",  Icon: "Radio",            Order: 9),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000010"), Code: "alerts",      Name: "Alertas",          Icon: "Bell",             Order: 10),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000011"), Code: "users",       Name: "Usuários",         Icon: "Users",            Order: 11),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000012"), Code: "units",       Name: "Unidades",         Icon: "Building2",        Order: 12),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000013"), Code: "reports",     Name: "Relatórios",       Icon: "FileText",         Order: 13),
            (Id: Guid.Parse("66666666-0000-0000-0000-000000000014"), Code: "settings",    Name: "Configurações",    Icon: "Settings",         Order: 14),
        };

        var permCodeToId = new Dictionary<string, Guid>();
        var permissions  = new List<Permission>();

        foreach (var m in moduleDefs)
        {
            db.Modules.Add(new Module
            {
                Id           = m.Id,
                Code         = m.Code,
                Name         = m.Name,
                Icon         = m.Icon,
                DisplayOrder = m.Order,
                IsActive     = true
            });

            var codes = PermissionCodes.All.Where(c => c.StartsWith(m.Code + ":")).ToList();
            for (int i = 0; i < codes.Count; i++)
            {
                var permId = Guid.NewGuid();
                var code   = codes[i];
                var action = code.Split(':')[1];

                permissions.Add(new Permission
                {
                    Id           = permId,
                    ModuleId     = m.Id,
                    Code         = code,
                    Name         = CapFirst(action.Replace("_", " ")),
                    DisplayOrder = i + 1
                });
                permCodeToId[code] = permId;
            }
        }

        db.Permissions.AddRange(permissions);
        return permCodeToId;
    }

    private static void SeedRolesAndPermissions(AppDbContext db, Dictionary<string, Guid> permCodeToId)
    {
        var all = PermissionCodes.All;

        var financeiroCodes = all.Where(c =>
            c.StartsWith("dashboard:") || c.StartsWith("financial:") ||
            c.StartsWith("payables:")  || c.StartsWith("receivables:") ||
            c.StartsWith("budgets:")   || c.StartsWith("cashflow:") ||
            c.StartsWith("alerts:")    || c.StartsWith("reports:") ||
            c == PermissionCodes.Calendar.View || c == PermissionCodes.Channels.View
        ).ToList();

        var comprasCodes = all.Where(c =>
            c == PermissionCodes.Dashboard.View  ||
            c.StartsWith("purchases:")           ||
            c == PermissionCodes.Budgets.View    ||
            c == PermissionCodes.Alerts.View     ||
            c == PermissionCodes.Reports.View
        ).ToList();

        var viewExportCodes = all
            .Where(c => c.EndsWith(":view") || c.EndsWith(":export"))
            .ToList();

        var auditorCodes = viewExportCodes
            .Append(PermissionCodes.Reports.Share)
            .Distinct()
            .ToList();

        var roleDefs = new[]
        {
            (Id: RoleSuperAdminId, Name: "Super Admin",   Desc: "Acesso total ao sistema, protegido pelo sistema",    Codes: (IList<string>)all),
            (Id: RoleAdminId,      Name: "Administrador", Desc: "Administrador geral das unidades",                   Codes: (IList<string>)all),
            (Id: RoleFinanceiroId, Name: "Financeiro",    Desc: "Acesso completo ao módulo financeiro",              Codes: financeiroCodes),
            (Id: RoleComprasId,    Name: "Compras",       Desc: "Responsável pelo módulo de compras e verbas",        Codes: comprasCodes),
            (Id: RoleSocioId,      Name: "Sócio",         Desc: "Leitura e exportação em todos os módulos",          Codes: viewExportCodes),
            (Id: RoleAuditorId,    Name: "Auditor",       Desc: "Auditoria com acesso a relatórios e histórico",     Codes: auditorCodes),
        };

        foreach (var (id, name, desc, codes) in roleDefs)
        {
            db.Roles.Add(new Role
            {
                Id          = id,
                Name        = name,
                Description = desc,
                IsSystem    = true,
                IsActive    = true,
                CreatedAt   = DateTime.UtcNow
            });

            foreach (var code in codes)
            {
                if (permCodeToId.TryGetValue(code, out var permId))
                    db.RolePermissions.Add(new RolePermission { RoleId = id, PermissionId = permId });
            }
        }
    }

    private static void SeedUnits(AppDbContext db)
    {
        db.Units.AddRange(
            new Unit { Id = UnitCentroId, Name = "Loja Centro", Identifier = "CENTRO", Status = UnitStatus.Active },
            new Unit { Id = UnitSulId,    Name = "Loja Sul",    Identifier = "SUL",    Status = UnitStatus.Active }
        );
    }

    private static void SeedCategories(AppDbContext db)
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
    }

    private static void SeedPaymentMethods(AppDbContext db)
    {
        db.PaymentMethods.AddRange(
            new PaymentMethod { Id = PmDinheiroId, Name = "Dinheiro" },
            new PaymentMethod { Id = PmPixId,      Name = "PIX" },
            new PaymentMethod { Id = PmDebitoId,   Name = "Cartão Débito" },
            new PaymentMethod { Id = PmCreditoId,  Name = "Cartão Crédito" },
            new PaymentMethod { Id = PmBoletoId,   Name = "Boleto" }
        );
    }

    private static void SeedSalesChannels(AppDbContext db)
    {
        db.SalesChannels.AddRange(
            new SalesChannel { Id = ScBalcaoId,   Name = "Balcão" },
            new SalesChannel { Id = ScDeliveryId, Name = "Delivery" },
            new SalesChannel { Id = ScIfoodId,    Name = "iFood" },
            new SalesChannel { Id = ScZeId,       Name = "Zé Delivery" }
        );
    }

    private static async Task SeedUsers(UserManager<AppUser> userManager, AppDbContext db)
    {
        var users = new[]
        {
            (Id: UserAdminId,     First: "Super",       Last: "Admin",   Email: "admin@demo.com",      RoleId: RoleSuperAdminId, IsSystem: true,  Units: new[] { UnitCentroId, UnitSulId }),
            (Id: UserFinCentroId, First: "Financeiro",  Last: "Centro",  Email: "fin.centro@demo.com", RoleId: RoleFinanceiroId, IsSystem: false, Units: new[] { UnitCentroId }),
            (Id: UserFinSulId,    First: "Financeiro",  Last: "Sul",     Email: "fin.sul@demo.com",    RoleId: RoleFinanceiroId, IsSystem: false, Units: new[] { UnitSulId }),
            (Id: UserSocioId,     First: "Rodrigo",     Last: "Mendes",  Email: "socio@demo.com",      RoleId: RoleSocioId,      IsSystem: false, Units: new[] { UnitCentroId, UnitSulId }),
            (Id: UserComprasId,   First: "Ana",         Last: "Compras", Email: "compras@demo.com",    RoleId: RoleComprasId,    IsSystem: false, Units: new[] { UnitCentroId, UnitSulId }),
        };

        foreach (var (id, first, last, email, roleId, isSystem, unitIds) in users)
        {
            var user = new AppUser
            {
                Id           = id,
                FirstName    = first,
                LastName     = last,
                Email        = email,
                UserName     = email,
                Status       = UserStatus.Active,
                IsSystemUser = isSystem
            };

            await userManager.CreateAsync(user, "Demo@123");

            db.UserUnits.AddRange(unitIds.Select(uid => new UserUnit
            {
                UserId     = id,
                UnitId     = uid,
                RoleId     = roleId,
                IsActive   = true,
                AssignedAt = DateTime.UtcNow
            }));
        }
    }

    private static void SeedFinancialHistory(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var entries = new List<FinancialEntry>();
        var rng = new Random(42);

        foreach (var (unitId, baseRevenue) in new[] { (UnitCentroId, 28000m), (UnitSulId, 21000m) })
        {
            for (int m = 5; m >= 0; m--)
            {
                var month = today.AddMonths(-m);

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

                var expenses = new[]
                {
                    (CatFornecedorId, "Compra de estoque",     baseRevenue * 0.35m),
                    (CatFreteId,      "Frete e logística",      baseRevenue * 0.05m),
                    (CatMarketingId,  "Marketing e divulgação", baseRevenue * 0.03m),
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
    }

    private static void SeedAccountsPayable(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var payables = new List<AccountPayable>();

        foreach (var unitId in new[] { UnitCentroId, UnitSulId })
        {
            var baseRent = unitId == UnitCentroId ? 4500m : 3200m;

            for (int m = 2; m >= 1; m--)
            {
                var due = today.AddMonths(-m).WithDay(5);
                payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Aluguel",            Amount = baseRent, DueDate = due,          PaidDate = due.AddDays(2),      PaidAmount = baseRent, Status = AccountPayableStatus.Paid,    UnitId = unitId, CategoryId = CatAluguelId,   PaymentMethodId = PmBoletoId });
                payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Folha de Pagamento", Amount = 8200m,   DueDate = due.WithDay(1), PaidDate = due.WithDay(1), PaidAmount = 8200m,    Status = AccountPayableStatus.Paid,    UnitId = unitId, CategoryId = CatFolhaId,     PaymentMethodId = PmPixId });
            }

            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Aluguel",            Amount = baseRent, DueDate = today.WithDay(5),  Status = AccountPayableStatus.Pending, UnitId = unitId, CategoryId = CatAluguelId,   PaymentMethodId = PmBoletoId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Folha de Pagamento", Amount = 8200m,    DueDate = today.WithDay(1),  Status = AccountPayableStatus.Paid, PaidDate = today.WithDay(1), PaidAmount = 8200m, UnitId = unitId, CategoryId = CatFolhaId, PaymentMethodId = PmPixId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Fornecedor Bebidas", Amount = 12400m,   DueDate = today.AddDays(3),  Status = AccountPayableStatus.Pending, UnitId = unitId, CategoryId = CatFornecedorId, PaymentMethodId = PmBoletoId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Serviço de Marketing", Amount = 1800m,  DueDate = today.AddDays(7),  Status = AccountPayableStatus.Pending, UnitId = unitId, CategoryId = CatMarketingId, PaymentMethodId = PmPixId });
            payables.Add(new AccountPayable { Id = Guid.NewGuid(), Description = "Energia Elétrica",   Amount = 920m,     DueDate = today.AddDays(-5), Status = AccountPayableStatus.Overdue,  UnitId = unitId, CategoryId = CatOutrosId, PaymentMethodId = PmBoletoId });
        }

        db.AccountsPayable.AddRange(payables);
    }

    private static void SeedAccountsReceivable(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var receivables = new List<AccountReceivable>();

        foreach (var unitId in new[] { UnitCentroId, UnitSulId })
        {
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse iFood",       ExpectedAmount = 8400m, ReceivedAmount = 8400m, ExpectedDate = today.AddMonths(-1).WithDay(15), ReceivedDate = today.AddMonths(-1).WithDay(16), Status = AccountReceivableStatus.Received, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse Zé Delivery", ExpectedAmount = 6200m, ReceivedAmount = 6200m, ExpectedDate = today.AddMonths(-1).WithDay(20), ReceivedDate = today.AddMonths(-1).WithDay(21), Status = AccountReceivableStatus.Received, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse iFood",       ExpectedAmount = 8900m, ExpectedDate = today.AddDays(5),  Status = AccountReceivableStatus.Pending, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Repasse Zé Delivery", ExpectedAmount = 6500m, ExpectedDate = today.AddDays(8),  Status = AccountReceivableStatus.Pending, UnitId = unitId, CategoryId = CatVendasId, PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Crédito de Frete",    ExpectedAmount = 1200m, ExpectedDate = today.AddDays(12), Status = AccountReceivableStatus.Pending, UnitId = unitId, CategoryId = CatFreteId,  PaymentMethodId = PmPixId });
            receivables.Add(new AccountReceivable { Id = Guid.NewGuid(), Description = "Acerto de caixa cliente", ExpectedAmount = 3400m, ExpectedDate = today.AddDays(-3), Status = AccountReceivableStatus.Overdue, UnitId = unitId, CategoryId = CatOutrosId, PaymentMethodId = PmDinheiroId });
        }

        db.AccountsReceivable.AddRange(receivables);
    }

    private static void SeedBudgetsAndPurchases(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var budgets   = new List<Budget>();
        var purchases = new List<Purchase>();

        foreach (var (unitId, totalBudget) in new[] { (UnitCentroId, 35000m), (UnitSulId, 26000m) })
        {
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

                purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Estoque mensal",       Amount = Math.Round(totalBudget * 0.55m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatFornecedorId, BudgetId = b.Id, DueDate = new DateOnly(month.Year, month.Month, 10) });
                purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Frete e distribuição", Amount = Math.Round(totalBudget * 0.18m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatFreteId,      BudgetId = b.Id, DueDate = new DateOnly(month.Year, month.Month, 15) });
                purchases.Add(new Purchase { Id = Guid.NewGuid(), Description = "Marketing mensal",     Amount = Math.Round(totalBudget * 0.15m, 2), Status = PurchaseStatus.Confirmed, UnitId = unitId, CategoryId = CatMarketingId,  BudgetId = b.Id, DueDate = new DateOnly(month.Year, month.Month, 20) });
            }

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
    }

    private static void SeedAlerts(AppDbContext db)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        db.Alerts.AddRange(
            new Alert { Id = Guid.NewGuid(), Type = AlertType.UpcomingDue,    Message = "Aluguel Loja Centro",             UnitId = UnitCentroId, CreatedAt = now, DueDate = today.AddDays(5)  },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.UpcomingDue,    Message = "Fornecedor Bebidas (Loja Centro)", UnitId = UnitCentroId, CreatedAt = now, DueDate = today.AddDays(3)  },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.OverduePayable, Message = "Energia Elétrica — Loja Centro",  UnitId = UnitCentroId, CreatedAt = now, DueDate = today.AddDays(-5) },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.UpcomingDue,    Message = "Aluguel Loja Sul",                UnitId = UnitSulId,    CreatedAt = now, DueDate = today.AddDays(5)  },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.OverduePayable, Message = "Energia Elétrica — Loja Sul",     UnitId = UnitSulId,    CreatedAt = now, DueDate = today.AddDays(-5) },
            new Alert { Id = Guid.NewGuid(), Type = AlertType.LowBudget,      Message = "Verba da Loja Sul está com 58% utilizado", UnitId = UnitSulId, CreatedAt = now }
        );
    }

    private static string GetChannelName(Guid channelId) => channelId switch
    {
        var id when id == ScBalcaoId   => "Balcão",
        var id when id == ScDeliveryId => "Delivery",
        var id when id == ScIfoodId    => "iFood",
        var id when id == ScZeId       => "Zé Delivery",
        _                              => "Canal"
    };

    private static string CapFirst(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s[1..];
}

file static class DateOnlyExtensions
{
    public static DateOnly WithDay(this DateOnly date, int day) =>
        new(date.Year, date.Month, Math.Min(day, DateTime.DaysInMonth(date.Year, date.Month)));
}
