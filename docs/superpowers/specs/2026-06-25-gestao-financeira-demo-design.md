# Spec — Sistema de Gestão Financeira (Demo Profissional)

## Contexto

Projeto demonstração para apresentar a uma empresa do segmento de bebidas (distribuidora/lojas). O objetivo é convencer o cliente a contratar o desenvolvimento do sistema completo. Mesmo que não feche, o projeto serve como portfólio. O sistema real é grande (18 módulos); esta demo é reduzida mas extremamente profissional, cobrindo os módulos mais impactantes. A base de código já existe em ASP.NET Core 10 + React/TypeScript com dados em memória — precisa ser reestruturada e expandida.

---

## Decisões Técnicas

| Item | Decisão |
|---|---|
| Backend | ASP.NET Core 10 — Clean Architecture |
| Banco de dados | PostgreSQL + EF Core (Code First, Migrations) |
| Autenticação | ASP.NET Core Identity + JWT |
| Frontend | React 19 + TypeScript + Vite |
| UI Components | shadcn/ui |
| CSS | Tailwind CSS (mobile-first, tokens de marca) |
| Gráficos | Recharts |
| Data fetching | TanStack Query (React Query) |
| Formulários | React Hook Form + Zod |
| Roteamento | React Router v7 (já no projeto) |
| Responsividade | Web responsivo — sem app mobile nativo |

---

## Paleta de Cores — Tokens Tailwind

```js
// tailwind.config.js
colors: {
  brand: {
    navy:     '#0f2860',  // primária — sidebar, títulos
    bordeaux: '#441114',  // despesas, alertas críticos
    gold:     '#fbc654',  // acento principal, saldo positivo
    orange:   '#f78802',  // acento secundário, CTAs
    blue:     '#3b91d1',  // receitas, links, pills
    beige:    '#f4d390',  // fundo suave, subtítulos no dark
    cream:    '#fff4e1',  // fundo alternativo
  }
}
```

---

## Design System

**Layout:** Sidebar fixo à esquerda (text-based, expansível) + área de conteúdo com fundo `#f9fafb`.

**Sidebar:**
- Fundo: `brand-navy` (`#0f2860`)
- Item ativo: borda esquerda `brand-gold` (`#fbc654`) + fundo `rgba(255,255,255,0.08)` + texto branco
- Itens inativos: texto branco 55% opacidade
- Logo/nome: branco + `brand-beige`

**Cards KPI:**
- Receita: card branco, valor `brand-navy`
- Despesa: card branco, valor `brand-bordeaux`
- Saldo positivo: card `brand-gold`, valor `brand-navy`
- Saldo negativo: card `brand-bordeaux`, valor branco

**Gráficos (Recharts):**
- Entradas: `brand-blue` (`#3b91d1`)
- Saídas: `brand-bordeaux` (`#441114`)
- Saldo: `brand-gold` (`#fbc654`)

**Mobile responsivo:**
- Breakpoints Tailwind padrão (`sm`, `md`, `lg`)
- Sidebar colapsa em hambúrguer em `< md`
- Cards KPI empilham em coluna em mobile
- Tabelas com `overflow-x-auto`

---

## Arquitetura Backend — Clean Architecture

```
Demo.Server/
├── Domain/
│   ├── Entities/          → User, Unit, FinancialEntry, AccountPayable,
│   │                         AccountReceivable, Budget, Purchase, Alert
│   ├── Enums/             → EntryType, AccountStatus, BudgetStatus, AlertType, RoleType
│   └── Interfaces/        → IRepository<T>, IUnitOfWork
├── Application/
│   ├── UseCases/          → pasta por módulo (Auth, Units, Users, Entries, etc.)
│   ├── DTOs/              → Request/Response por use case
│   ├── Validators/        → FluentValidation por command
│   └── Interfaces/        → IAuthService, IDashboardService, etc.
├── Infrastructure/
│   ├── Persistence/       → AppDbContext, Migrations, configurações EF
│   ├── Identity/          → ASP.NET Core Identity setup, JWT service
│   ├── Repositories/      → implementações dos repositórios
│   └── Seed/              → DataSeeder (roda no startup em dev)
└── Presentation/
    ├── Controllers/        → um controller por módulo
    ├── Middleware/         → ExceptionHandler, JWT validation
    └── Extensions/        → ServiceCollection extensions por camada
```

**Entidades principais do Domain:**

- `Unit` — Loja (Id, Nome, Identificador, Status)
- `AppUser` (Identity) — vinculado a uma ou mais unidades via `UserUnit`
- `FinancialCategory` — categoria de receita/despesa
- `PaymentMethod` — forma de pagamento
- `SalesChannel` — canal de venda (Balcão, Delivery, iFood, Zé Delivery)
- `FinancialEntry` — lançamento (receita ou despesa, vinculado a Unit)
- `AccountPayable` — conta a pagar (vencimento, status, Unit)
- `AccountReceivable` — conta a receber (data prevista, status, Unit)
- `Budget` — verba por período e unidade (valor total, saldo disponível)
- `Purchase` — compra financeira vinculada a Budget e Unit
- `Alert` — alerta gerado por saldo negativo, vencimento próximo, verba estourada

---

## Módulos — Escopo da Demo

### Fora do escopo (não implementar)
- DRE Simplificado (módulo 9)
- Relatórios & Exportação PDF/Excel (módulo 12)
- Parâmetros Financeiros com UI (módulo 15) → entram como seed pré-configurado
- App mobile nativo
- Integrações com APIs externas (iFood, Zé Delivery)
- Conciliação bancária, emissão fiscal, ERP

### Fase 1 — Fundação (pré-requisito)
**Deve ser feita antes de qualquer módulo.**
- Reestruturar projeto em Clean Architecture
- Configurar PostgreSQL + EF Core + Migrations
- Configurar ASP.NET Core Identity + geração JWT
- Implementar `DataSeeder` com dados ricos para a demo

**Seed deve incluir:**
- 2 unidades: "Loja Centro" e "Loja Sul"
- 5 usuários: Admin (acesso total), Financeiro Loja Centro, Financeiro Loja Sul, Sócio (apenas consulta), Compras
- Categorias: Venda de Bebidas, Frete, Aluguel, Folha de Pagamento, Fornecedor, Marketing, Outros
- Canais de venda: Balcão, Delivery, iFood, Zé Delivery
- Formas de pagamento: Dinheiro, PIX, Cartão Débito, Cartão Crédito, Boleto
- 6 meses de histórico de lançamentos distribuídos entre as 2 lojas
- Contas a pagar e receber com diferentes status (pagas, pendentes, vencidas)
- Verbas cadastradas por loja para os últimos 3 meses
- Compras associadas às verbas
- Alertas pré-gerados (vencimento próximo, saldo de verba baixo)

### Fase 2 — Acesso & Gestão
| # | Módulo | O que entrega |
|---|---|---|
| 1 | **Autenticação** | Tela de login, logout, redirecionamento por perfil (Admin vê tudo, Sócio vê apenas consulta) |
| 13 | **Gestão de Unidades** | CRUD de lojas, filtro global de unidade no header |
| 14 | **Usuários & Permissões** | CRUD de usuários, perfis, vinculação de usuário ↔ unidade |

### Fase 3 — Módulos Financeiros Operacionais
| # | Módulo | O que entrega |
|---|---|---|
| 3 | **Lançamentos Financeiros** | Registro manual de receitas/despesas, filtros por categoria, canal, forma de pgto, período |
| 4 | **Contas a Pagar** | Cadastro, vencimentos, baixa de pagamento, alertas de vencimento próximo |
| 5 | **Contas a Receber** | Recebimentos previstos, registro de recebimento, filtro por status |
| 7 | **Controle de Verbas** | Saldo disponível por loja/período, histórico de movimentações |
| 8 | **Controle de Compras** | Registro de compras vinculadas à verba, alerta de limite estourado |

### Fase 4 — Inteligência & Visão (o "wow" da apresentação)
| # | Módulo | O que entrega |
|---|---|---|
| 2 | **Dashboard Gerencial** | KPIs (receita, despesa, saldo), gráfico de fluxo Recharts, top categorias, filtro loja/período |
| 6 | **Fluxo de Caixa** | Entradas vs saídas por dia/semana/mês, saldo previsto vs realizado |
| 10 | **Calendário Financeiro** | Visualização mensal de vencimentos e recebimentos, clique por dia |
| 11 | **Canais de Venda** | Gráfico comparativo por canal (iFood, Zé Delivery, Balcão, Delivery) |
| 16 | **Alertas Financeiros** | Badges no sidebar, painel de alertas: saldo negativo, vencimentos próximos, verba estourada |

---

## Frontend — Estrutura de Arquivos

```
demo.client/src/
├── components/
│   ├── ui/                → shadcn/ui components (Button, Card, Dialog, Table, etc.)
│   ├── layout/            → Sidebar, Navbar, Layout, MobileMenu
│   └── shared/            → AlertBadge, UnitSelector, PeriodFilter, StatusBadge
├── pages/
│   ├── auth/              → Login.tsx
│   ├── dashboard/         → Dashboard.tsx
│   ├── entries/           → FinancialEntries.tsx, EntryForm.tsx
│   ├── payables/          → AccountsPayable.tsx, PayableForm.tsx
│   ├── receivables/       → AccountsReceivable.tsx, ReceivableForm.tsx
│   ├── budgets/           → Budgets.tsx, BudgetForm.tsx
│   ├── purchases/         → Purchases.tsx, PurchaseForm.tsx
│   ├── cashflow/          → CashFlow.tsx
│   ├── calendar/          → FinancialCalendar.tsx
│   ├── channels/          → SalesChannels.tsx
│   ├── alerts/            → Alerts.tsx
│   ├── units/             → Units.tsx, UnitForm.tsx
│   └── users/             → Users.tsx, UserForm.tsx
├── services/
│   └── api.ts             → HTTP client por módulo (refatorar o existente)
├── hooks/
│   └── useAuth.ts, useUnit.ts, useDashboard.ts, etc.
├── types/
│   └── index.ts           → interfaces TypeScript (expandir o existente)
└── lib/
    └── utils.ts            → helpers de formatação (moeda, data)
```

---

## Verificação — Como testar a demo

1. **Subir PostgreSQL** local (Docker ou instalação direta) e configurar `appsettings.Development.json`
2. **Rodar migrations** com `dotnet ef database update`
3. **Seed automático** no startup: verificar que as 2 lojas, 5 usuários e histórico de dados aparecem
4. **Login como Admin** → verificar acesso a todos os módulos e dados consolidados das 2 lojas
5. **Login como Sócio** → verificar que apenas consultas estão disponíveis, sem botões de criação
6. **Dashboard** → verificar KPIs carregados, gráfico de fluxo de caixa, filtro por loja funcionando
7. **Calendário** → verificar vencimentos e recebimentos nas datas corretas
8. **Verbas** → criar uma compra e verificar que o saldo da verba diminui
9. **Alertas** → verificar badge no sidebar e painel de alertas com eventos pré-seeded
10. **Mobile** → abrir em 375px e verificar sidebar hambúrguer, cards empilhados, tabelas com scroll
