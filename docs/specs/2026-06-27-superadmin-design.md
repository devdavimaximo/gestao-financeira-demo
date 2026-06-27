# Super Administração — Design Spec
**Data:** 2026-06-27  
**Status:** Aprovado para implementação  
**Projeto:** Gestão Financeira Demo  

---

## 1. Diagnóstico do Sistema Atual

### O que existe hoje
- 4 roles hardcoded: `Admin`, `Financial`, `Purchases`, `Partner`
- `AppUser` com apenas `FullName`, `IsActive`, `CreatedAt` — sem perfil completo
- Autorização por `[Authorize(Roles = "Admin,Financial")]` direto nos controllers
- `UserUnit` sem `RoleId` — acesso a unidades sem papel definido
- Nenhuma tabela de permissão granular
- Nenhum log de auditoria
- Nenhum controle de sessão
- JWT retorna `role` como string única — multi-role não explorado
- Backend não valida `unitId` contra as unidades do usuário — risco de acesso cruzado
- Hard delete inexistente — apenas soft-delete via `IsActive=false`
- Tela de usuários com CRUD básico: nome, email, senha, role única, unidades

### Problemas críticos
| Categoria | Problema |
|-----------|----------|
| Segurança | Usuário pode requisitar dados de unidades às quais não pertence |
| Autorização | Sem permissões granulares — tudo ou nada por role |
| Escalabilidade | Adicionar novo módulo exige alterar código de autorização |
| Auditoria | Nenhuma rastreabilidade de quem fez o quê |
| UX Admin | Sem gestão de roles, permissões individuais, sessões ou histórico |
| Dados | Perfil de usuário incompleto para uso corporativo |

---

## 2. Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Escopo | Multi-unidade, empresa única | Não é SaaS multi-tenant |
| Permissões | Por unidade (usuário tem role diferente por unidade) | Controle máximo |
| Base de auth | Identity para usuários + permissões custom | Melhor custo-benefício |
| Schema | Reconstruir tabelas de auth do zero | Sem bagagem do schema antigo |
| Dados financeiros | Mantidos intactos | Nenhuma relação com usuários no schema financeiro |

---

## 3. Arquitetura da Solução

### Abordagem
**Identity para usuários + Permission Layer custom com escopo por unidade.**

O ASP.NET Identity cuida apenas de: hash de senha, `UserManager`, validação de email único, tokens de reset de senha e futuramente MFA. Todo o sistema de autorização (roles, permissões, claims) é construído do zero em cima, sem depender de `IdentityRole` ou `IdentityUserRole`.

### Estrutura de camadas

```
Presentation
  └── Controllers/Admin/
        ├── AdminUsersController
        ├── AdminRolesController
        ├── AdminPermissionsController
        ├── AdminAuditController
        └── AdminSessionsController

Application
  └── Services/
        ├── IUserAdminService / UserAdminService
        ├── IRoleService / RoleService
        ├── IPermissionResolverService / PermissionResolverService
        ├── IAuditService / AuditService
        └── ISessionService / SessionService

Domain
  └── Entities/Auth/
        ├── AppUser (extended)
        ├── Module
        ├── Permission
        ├── Role
        ├── RolePermission
        ├── UserUnit (extended)
        ├── UserUnitPermission
        ├── AuditLog
        └── UserSession
  └── Enums/
        └── UserStatus

Infrastructure
  └── Authorization/
        ├── PermissionAuthorizationHandler
        ├── RequirePermissionAttribute
        └── PermissionAuthorizationRequirement
  └── JWT/
        └── JwtService (reescrito)
```

---

## 4. Modelo de Entidades

### AppUser *(estende IdentityUser\<Guid\>)*
```csharp
public class AppUser : IdentityUser<Guid>
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string? Phone { get; set; }
    public string? Position { get; set; }        // Cargo
    public string? AvatarUrl { get; set; }
    public string? Notes { get; set; }
    public UserStatus Status { get; set; }       // enum
    public bool ForcePasswordChange { get; set; }
    public DateTime? PasswordExpiresAt { get; set; }
    public int? MaxLoginAttempts { get; set; }
    public DateTime? BlockedUntil { get; set; }
    public bool IsSystemUser { get; set; }       // Não pode ser excluído
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedByUserId { get; set; }

    public ICollection<UserUnit> UserUnits { get; set; }
    public ICollection<UserSession> Sessions { get; set; }
    public ICollection<AuditLog> AuditLogs { get; set; }
}
```

**Propriedade computada:** `FullName => $"{FirstName} {LastName}"`

### UserStatus *(enum)*
```csharp
public enum UserStatus
{
    Active = 1,
    Blocked = 2,
    Suspended = 3,          // Temporário — BlockedUntil define até quando
    AwaitingActivation = 4, // Criado pelo admin, nunca logou
    Deactivated = 5         // Soft-delete — histórico preservado
}
```

### Module *(seeded)*
```csharp
public class Module
{
    public Guid Id { get; set; }
    public string Code { get; set; }        // "financial", "users", "reports"
    public string Name { get; set; }        // "Financeiro", "Usuários"
    public string? Icon { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public ICollection<Permission> Permissions { get; set; }
}
```

### Permission *(seeded por módulo)*
```csharp
public class Permission
{
    public Guid Id { get; set; }
    public Guid ModuleId { get; set; }
    public Module Module { get; set; }
    public string Code { get; set; }        // "financial:approve"
    public string Name { get; set; }        // "Aprovar"
    public int DisplayOrder { get; set; }
}
```

### Role *(totalmente customizável)*
```csharp
public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public bool IsSystem { get; set; }      // Não pode ser excluído
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public ICollection<RolePermission> RolePermissions { get; set; }
    public ICollection<UserUnit> UserUnits { get; set; }
}
```

### RolePermission *(bridge N:M)*
```csharp
public class RolePermission
{
    public Guid RoleId { get; set; }
    public Role Role { get; set; }
    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; }
}
```

### UserUnit *(expandido com RoleId)*
```csharp
public class UserUnit
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; }
    public Guid UnitId { get; set; }
    public Unit Unit { get; set; }
    public Guid RoleId { get; set; }        // Role do usuário NESTA unidade
    public Role Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime AssignedAt { get; set; }
    public Guid? AssignedByUserId { get; set; }
}
```

### UserUnitPermission *(override individual por usuário+unidade)*
```csharp
public class UserUnitPermission
{
    public Guid UserId { get; set; }
    public Guid UnitId { get; set; }
    public Guid PermissionId { get; set; }
    public bool IsGranted { get; set; }     // true = concede, false = nega explicitamente
    public DateTime GrantedAt { get; set; }
    public Guid? GrantedByUserId { get; set; }
}
```

### AuditLog
```csharp
public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? ActorUserId { get; set; }  // Nullable: preservado se usuário excluído
    public AppUser? ActorUser { get; set; }
    public string Action { get; set; }       // "UserCreated", "PermissionChanged"
    public string EntityType { get; set; }   // "User", "Role", "Permission"
    public string? EntityId { get; set; }
    public string? Before { get; set; }      // JSON serializado
    public string? After { get; set; }       // JSON serializado
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### UserSession
```csharp
public class UserSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public AppUser User { get; set; }
    public string JwtId { get; set; }        // = jti claim do JWT
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

---

## 5. Estrutura de Tabelas

```sql
-- Removidas do schema antigo:
-- AspNetRoles, AspNetUserRoles, AspNetRoleClaims

-- Mantidas do Identity:
-- Users (AspNetUsers → renomeado), AspNetUserClaims,
-- AspNetUserLogins, AspNetUserTokens

-- Novas tabelas:
Modules          (Id, Code, Name, Icon, DisplayOrder, IsActive)
Permissions      (Id, ModuleId, Code, Name, DisplayOrder)
Roles            (Id, Name, Description, IsSystem, IsActive, CreatedAt, CreatedByUserId)
RolePermissions  (RoleId, PermissionId)  -- PK composta
UserUnits        (UserId, UnitId, RoleId, IsActive, AssignedAt, AssignedByUserId)
UserUnitPerms    (UserId, UnitId, PermissionId, IsGranted, GrantedAt, GrantedByUserId)
AuditLogs        (Id, ActorUserId, Action, EntityType, EntityId, Before, After, IpAddress, UserAgent, CreatedAt)
UserSessions     (Id, UserId, JwtId, IpAddress, UserAgent, IsRevoked, ExpiresAt, LastSeenAt, CreatedAt)
```

**Índices necessários:**
- `UserUnits(UserId, UnitId)` — busca de acesso por usuário
- `UserUnitPerms(UserId, UnitId)` — resolução de overrides
- `UserSessions(JwtId)` — validação por request
- `UserSessions(UserId, IsRevoked)` — listagem de sessões ativas
- `AuditLogs(EntityType, EntityId)` — histórico por entidade
- `AuditLogs(ActorUserId)` — histórico por ator

---

## 6. Matriz de Módulos e Permissões

| Módulo | Code | Permissões |
|--------|------|-----------|
| Dashboard | `dashboard` | `view` |
| Lançamentos | `financial` | `view`, `create`, `edit`, `delete`, `approve`, `reverse`, `export` |
| Contas a Pagar | `payables` | `view`, `create`, `edit`, `pay`, `cancel`, `export` |
| Contas a Receber | `receivables` | `view`, `create`, `edit`, `receive`, `cancel`, `export` |
| Verbas/Orçamentos | `budgets` | `view`, `create`, `edit`, `close` |
| Compras | `purchases` | `view`, `create`, `edit`, `delete`, `confirm`, `cancel` |
| Fluxo de Caixa | `cashflow` | `view`, `export` |
| Calendário | `calendar` | `view` |
| Canais de Venda | `channels` | `view`, `export` |
| Alertas | `alerts` | `view`, `dismiss` |
| Usuários | `users` | `view`, `create`, `edit`, `delete`, `block`, `reset_password`, `manage_permissions` |
| Unidades | `units` | `view`, `create`, `edit`, `deactivate` |
| Relatórios | `reports` | `view`, `export`, `share` |
| Configurações | `settings` | `view`, `edit` |

**Formato dos codes:** `{módulo}:{ação}` — ex: `financial:approve`, `users:block`

---

## 7. Roles Seed (IsSystem = true)

| Role | Permissões |
|------|-----------|
| Super Admin | Todas as permissões de todos os módulos |
| Administrador | Tudo exceto: `users:delete`, `settings:edit` |
| Financeiro | `financial:*`, `payables:*`, `receivables:*`, `budgets:view`, `reports:view,export`, `dashboard:view` |
| Compras | `purchases:*`, `budgets:view,create,edit`, `dashboard:view` |
| Auditor | `*.view`, `*.export` (somente leitura em todos os módulos) |
| Parceiro | `dashboard:view`, `reports:view`, `cashflow:view`, `financial:view` |

---

## 8. Fluxo de Autenticação

### Login (POST /api/auth/login)
1. Busca `AppUser` por email
2. Verifica `Status`: se não for `Active`, retorna erro com motivo
3. Verifica `BlockedUntil`: se ainda bloqueado, retorna erro com tempo restante
4. `UserManager.CheckPasswordAsync` — valida senha
5. Incrementa tentativas falhas se necessário; bloqueia automaticamente após `MaxLoginAttempts`
6. Carrega `UserUnits` com `Role` e `RolePermissions` para cada unidade
7. Carrega `UserUnitPermissions` (overrides individuais por unidade)
8. `PermissionResolverService.Resolve(user, unitAssignments)` → dict `unitId → string[]`
9. Gera JWT com claims
10. Salva `UserSession` no banco
11. Retorna `AuthResponse`

### JWT Claims
```json
{
  "sub": "user-guid",
  "email": "joao@empresa.com",
  "name": "João Silva",
  "jti": "session-guid",
  "status": "Active",
  "units": [
    {
      "unitId": "uuid-centro",
      "role": "Financeiro",
      "perms": ["financial:view", "financial:create", "financial:approve", "reports:view"]
    },
    {
      "unitId": "uuid-sul",
      "role": "Auditor",
      "perms": ["financial:view", "reports:view"]
    }
  ],
  "exp": 1782591683
}
```

---

## 9. Fluxo de Autorização por Request

1. `JwtBearerMiddleware` valida assinatura e expiração do token
2. `SessionValidationMiddleware` verifica `jti` contra `UserSession.IsRevoked` no banco (com cache em memória curto — 30s TTL para evitar hit por request)
3. Controller/endpoint decorado com `[RequirePermission("financial:approve")]`
4. `PermissionAuthorizationHandler` extrai `X-Unit-Id` do header do request
5. Filtra o array `units` do JWT pelo `unitId` atual
6. Verifica se `perms[]` contém a permission requerida
7. Retorna `403 Forbidden` com mensagem específica se negado

### Attribute customizado
```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission)
        : base(policy: $"Permission:{permission}") { }
}
```

### Handler
```csharp
public class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var unitId = // extrai X-Unit-Id do HttpContext
        var units = // desserializa claim "units" do JWT
        var unitPerms = units.FirstOrDefault(u => u.UnitId == unitId)?.Perms;

        if (unitPerms?.Contains(requirement.Permission) == true)
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}
```

---

## 10. Algoritmo de Resolução de Permissões

Para cada unidade do usuário:
```
1. Pega RoleId do UserUnit para essa unidade
2. Carrega RolePermissions da Role → base_perms[]
3. Carrega UserUnitPermissions onde UserId=X e UnitId=Y
4. Para cada override:
   - IsGranted=true  → adiciona permission ao set se não existir
   - IsGranted=false → remove permission do set se existir
5. Resultado: permission set final para essa unidade
```

O set final é serializado no JWT como `perms[]` por unidade.

**Quando permissões mudam:** O `UserSession` do usuário é marcado como `IsRevoked=true`. O próximo request do usuário recebe `401`. Frontend detecta e força novo login para obter JWT atualizado.

---

## 11. Fluxo de Criação de Usuário

1. Admin preenche formulário:
   - FirstName, LastName (obrigatórios)
   - Email (único no sistema)
   - Senha definida manualmente (obrigatório) + confirmação
   - Phone, Position, AvatarUrl, Notes (opcionais)
   - Status inicial (`Active` ou `AwaitingActivation`)
   - ForcePasswordChange (checkbox)
   - Para cada unidade: seleciona Role
2. Backend valida:
   - Email único
   - Senha atende política de segurança (mín. 8 chars, maiúscula, número, especial)
   - Pelo menos uma unidade com role atribuída
3. `UserManager.CreateAsync(user, password)` — Identity cria e hasha a senha
4. Para cada unidade: insere `UserUnit` com `RoleId`
5. Registra `AuditLog { Action="UserCreated", After=JSON(perfil) }`
6. Retorna usuário criado

---

## 12. Fluxo de Edição de Permissões

### Alterar Role de usuário em uma unidade
1. Admin seleciona nova Role para o usuário na unidade X
2. Backend atualiza `UserUnit.RoleId`
3. Remove todos os `UserUnitPermission` do usuário para aquela unidade (overrides antigos ficam stale)
4. Marca sessões ativas do usuário como revogadas
5. Registra `AuditLog { Action="RoleChanged", Before=role_antiga, After=role_nova }`

### Adicionar permissão individual (override)
1. Admin ativa/desativa checkbox individual na tela de detalhe do usuário
2. Backend faz upsert em `UserUnitPermission { IsGranted=true/false }`
3. Marca sessões ativas do usuário como revogadas
4. Registra `AuditLog { Action="PermissionOverrideChanged" }`

### Editar permissões de uma Role
1. Admin marca/desmarca permissões na matriz
2. Backend faz sync de `RolePermissions` (remove as desmarcadas, insere as novas)
3. Marca sessões de TODOS os usuários que têm essa role como revogadas
4. Registra `AuditLog { Action="RolePermissionsUpdated" }`

---

## 13. Fluxo de Auditoria

Todo evento relevante é registrado via `IAuditService`:

```csharp
await _auditService.LogAsync(new AuditEntry
{
    ActorUserId = currentUserId,
    Action = "UserBlocked",
    EntityType = "User",
    EntityId = targetUserId.ToString(),
    Before = JsonSerializer.Serialize(userBefore),
    After = JsonSerializer.Serialize(userAfter),
    IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
    UserAgent = httpContext.Request.Headers.UserAgent
});
```

### Eventos auditados
| Ação | EntityType | Before/After |
|------|------------|-------------|
| UserCreated | User | — / perfil completo |
| UserUpdated | User | perfil anterior / novo |
| UserDeleted | User | perfil / — |
| UserStatusChanged | User | status anterior / novo |
| UserPasswordReset | User | — / — (não loga senha) |
| RoleAssigned | UserUnit | role anterior / nova |
| PermissionOverrideChanged | UserUnitPermission | IsGranted anterior / novo |
| RoleCreated | Role | — / definição |
| RoleUpdated | Role | permissões anteriores / novas |
| RoleDeleted | Role | definição / — |
| SessionRevoked | UserSession | jti / — |
| LoginSuccess | User | — / ip, agent |
| LoginFailed | User | — / motivo, ip |

---

## 14. Gestão de Usuários — Regras de Negócio

### Hard delete
- Permitido apenas se usuário **não** tiver dados financeiros vinculados (verificação futura — por ora, sem restrição técnica nos dados financeiros)
- Usuário com `IsSystemUser=true` não pode ser excluído
- Requer confirmação com digitação do nome completo no modal
- `AuditLog` preservado com `ActorUserId=null` (FK nullable)

### Soft delete (Desativar)
- Muda `Status` para `Deactivated`
- Revoga todas as sessões ativas
- Usuário não aparece em listagens por padrão (filtro `Status != Deactivated`)
- Pode ser reativado pelo admin

### Reset de senha
- Admin define nova senha manualmente
- `ForcePasswordChange=true` automaticamente
- Sessões atuais revogadas
- Registra auditoria (sem logar a senha)

### Bloquear / Suspender
- Bloquear: `Status=Blocked`, sessões revogadas imediatamente, sem `BlockedUntil`
- Suspender: `Status=Suspended` + `BlockedUntil=DateTime`, desbloqueio automático por job agendado

---

## 15. Estrutura de Telas — Frontend

### Rotas do módulo `/admin`

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/admin` | `AdminDashboard` | `users:view` |
| `/admin/usuarios` | `UserList` | `users:view` |
| `/admin/usuarios/:id` | `UserDetail` | `users:view` |
| `/admin/roles` | `RoleList` | `users:manage_permissions` |
| `/admin/roles/:id` | `RoleEditor` | `users:manage_permissions` |
| `/admin/permissoes` | `PermissionReference` | `users:manage_permissions` |
| `/admin/auditoria` | `AuditLog` | `users:view` |
| `/admin/sessoes` | `ActiveSessions` | `users:view` |

### Componentes novos necessários
- `PermissionMatrix` — grade de módulos × ações com checkboxes
- `UserUnitRoleCard` — card de usuário+unidade+role com botão de editar role
- `PermissionOverridePanel` — painel de overrides individuais por unidade
- `UserTimeline` — timeline de eventos do usuário
- `SessionCard` — card de sessão ativa com dados de dispositivo
- `UserStatusBadge` — badge com cor por status
- `ConfirmDeleteModal` — modal com campo de digitação do nome para confirmar exclusão
- `AuditLogTable` — tabela de auditoria com diff before/after

### Menu lateral
O menu de Super Admin fica como seção separada na sidebar existente, visível apenas para usuários com permissão `users:view`. Itens: Dashboard Admin, Usuários, Roles, Auditoria, Sessões Ativas.

---

## 16. Backend — Endpoints

### AdminUsersController `/api/admin/users`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/` | `users:view` |
| GET | `/:id` | `users:view` |
| POST | `/` | `users:create` |
| PUT | `/:id` | `users:edit` |
| DELETE | `/:id` | `users:delete` |
| POST | `/:id/block` | `users:block` |
| POST | `/:id/unblock` | `users:block` |
| POST | `/:id/suspend` | `users:block` |
| POST | `/:id/activate` | `users:edit` |
| POST | `/:id/reset-password` | `users:reset_password` |
| GET | `/:id/timeline` | `users:view` |
| GET | `/:id/sessions` | `users:view` |
| GET | `/:id/permissions/:unitId` | `users:view` |
| PUT | `/:id/permissions/:unitId` | `users:manage_permissions` |
| PUT | `/:id/units` | `users:manage_permissions` |

### AdminRolesController `/api/admin/roles`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/` | `users:manage_permissions` |
| GET | `/:id` | `users:manage_permissions` |
| POST | `/` | `users:manage_permissions` |
| PUT | `/:id` | `users:manage_permissions` |
| DELETE | `/:id` | `users:manage_permissions` |
| POST | `/:id/duplicate` | `users:manage_permissions` |

### AdminPermissionsController `/api/admin/permissions`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/modules` | `users:manage_permissions` |
| GET | `/modules/:moduleId` | `users:manage_permissions` |

### AdminAuditController `/api/admin/audit`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/` | `users:view` |
| GET | `/user/:userId` | `users:view` |
| GET | `/entity/:type/:id` | `users:view` |

### AdminSessionsController `/api/admin/sessions`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/` | `users:view` |
| DELETE | `/:id` | `users:block` |
| DELETE | `/user/:userId` | `users:block` |
| DELETE | `/all` | `users:block` |

---

## 17. Escalabilidade

Para adicionar um novo módulo no futuro:
1. Inserir registro em `Modules` com novo `code`
2. Inserir registros em `Permissions` com os codes das ações
3. Zero alteração de código no sistema de autorização
4. Admin atualiza as roles que devem ter acesso ao novo módulo via interface

---

## 18. Plano de Implementação — Etapas

### Etapa 1 — Schema e Entidades (Backend)
- Remover `AspNetRoles`, `AspNetUserRoles`, `AspNetRoleClaims` do DbContext
- Criar entidades: `Module`, `Permission`, `Role`, `RolePermission`, `UserUnitPermission`, `AuditLog`, `UserSession`
- Expandir `AppUser` com novos campos e `UserStatus`
- Expandir `UserUnit` com `RoleId`
- Nova migration
- Seed: módulos, permissões, roles padrão, usuários com perfil completo

### Etapa 2 — Auth Core (Backend)
- Reescrever `JwtService`: gera claims com array `units[]`
- Criar `PermissionResolverService`: resolve permissão final por unidade
- Criar `SessionValidationMiddleware`: valida `jti` por request
- Criar `RequirePermissionAttribute` + `PermissionAuthorizationHandler`
- Registrar policies no `Program.cs`
- Reescrever `AuthController.Login` com novo fluxo

### Etapa 3 — API de Admin (Backend)
- `AdminUsersController`: CRUD completo + ações de status + reset senha
- `AdminRolesController`: CRUD de roles + duplicar
- `AdminPermissionsController`: leitura de módulos/permissões
- `AdminAuditController`: consulta de auditoria com filtros
- `AdminSessionsController`: listagem + revogação
- `IAuditService` + decorador automático para logging
- Validações: hard delete, IsSystemUser, roles IsSystem

### Etapa 4 — Proteção dos Controllers Existentes (Backend)
- Substituir `[Authorize(Roles = "Admin,Financial")]` por `[RequirePermission("financial:create")]` em todos os controllers
- Adicionar `X-Unit-Id` como requisito nos endpoints que operam por unidade
- Validar que `unitId` do request está na lista de unidades do usuário no JWT

### Etapa 5 — Frontend: Base e Usuários
- Nova seção `/admin` na sidebar (condicional por permissão)
- `UserList`: tabela com busca, filtros, paginação
- `UserDetail`: perfil + unidades+roles + timeline + sessões + ações
- Formulário de criação: perfil completo + senha manual + assign unidades+roles
- `ConfirmDeleteModal` com digitação do nome
- `UserStatusBadge` + `UserTimeline`

### Etapa 6 — Frontend: Roles e Permissões
- `RoleList`: lista com badge de sistema, duplicar, excluir
- `RoleEditor`: `PermissionMatrix` com checkboxes por módulo/ação
- `UserUnitRoleCard`: assign de role por unidade na tela de detalhe
- `PermissionOverridePanel`: overrides individuais

### Etapa 7 — Frontend: Auditoria e Sessões
- `AuditLogTable`: tabela com diff before/after em modal
- `ActiveSessions`: listagem com dados de dispositivo + revogar
- `AdminDashboard`: KPIs + alertas + últimas ações

### Etapa 8 — Menu dinâmico e proteção de rotas
- `AuthContext` atualizado: carrega `units[]` do JWT
- Hook `usePermission(permission, unitId)`: verifica se usuário tem permissão
- `PermissionGate` component: esconde elementos sem permissão
- `ProtectedRoute` atualizado: valida por permissão, não por role
- Sidebar oculta menus sem permissão automaticamente
