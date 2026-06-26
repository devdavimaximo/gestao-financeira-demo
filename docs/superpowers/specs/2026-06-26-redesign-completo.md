# Redesign Completo do Frontend — Gestão Financeira

**Data:** 2026-06-26  
**Status:** Aprovado pelo usuário — pronto para implementação

---

## 1. Contexto

Redesign completo do frontend. O layout anterior sofreu poucas alterações visuais e não gerava a sensação de "uau" ao entrar. O novo design é tratado como se apenas o backend existisse — estrutura, navegação e identidade visual do zero, mantendo 100% de compatibilidade com as APIs existentes.

---

## 2. Decisões de Design

### 2.1 Fundação Visual

| Token | Valor |
|---|---|
| Fundo do conteúdo | `#f1f3f8` |
| Cards | `#ffffff`, border `rgba(0,0,0,0.05)`, radius `14px` |
| Sidebar | `#0f2860` (brand-navy) |
| Hero block | `#0f2860` bg + `#fbc654` texto |
| Receita / Pago | `#16a34a` |
| Despesa / Vencido | `#dc2626` |
| Pendente / Alerta | `#f97316` |
| Informativo | `#3b91d1` |

**Modo:** Claro por padrão. Dark mode disponível como toggle (tokens CSS no `@theme`).

**Fonte:** Inter (já instalada). `font-variant-numeric: tabular-nums` em todos os valores financeiros.

### 2.2 Sidebar (H)

- Navy `#0f2860`, fixa, `width: 180px`
- Logo + nome da unidade no topo
- Grupos de navegação com section labels uppercase tiny
- Item ativo: `bg-white/8` + borda esquerda dourada `3px #fbc654` + `font-weight: 700`
- Indicador desliza com animação spring ao trocar de item
- Avatar + nome + role no rodapé
- Mobile: hidden por padrão, abre como overlay com botão hamburger no topbar

### 2.3 Dashboard — Layout J

```
┌─────────────────────────────────────────────────────┐
│ Dashboard                              [Jun 2025 ▾] │
├──────────────────────────────────┬──────────────────┤
│  HERO: Saldo do Período          │  Alertas         │
│  R$22.734 (gold, 38px)           │  5 (vermelho)    │
│  ↑14% · sparkline                │  2 urgentes      │
├───────────────┬──────────────────┴──────────────────┤
│  Receitas     │  Despesas        │  A Pagar          │
│  R$84.2k ↑8% │  R$61.5k ↑3%   │  R$12.3k 3 items │
├───────────────┴──────────────────┴──────────────────┤
│  Gráfico: Receitas vs Despesas (barras duplas)       │
└─────────────────────────────────────────────────────┘
```

Grid: `grid-template-columns: 1fr 100px` para row1, `repeat(3,1fr)` para row2.

### 2.4 Páginas Internas

**PageHeader:** título 19px bold + subtítulo + ação opcional alinhada à direita, com `border-b border-gray-100 pb-5 mb-6`.

**StatCards (topo de cada página):** 3–4 cards coloridos com fundo tintado:
- `amber-50/amber-100` — pendente
- `emerald-50/emerald-100` — pago/recebido  
- `red-50/red-100` — vencido/cancelado
- `navy/white` — totais principais
- `blue/white` — informativos

**Tabelas:**
- Fundo branco, `thead` com labels `text-[10px] uppercase tracking-widest text-gray-400`
- Linhas com `border-b border-gray-50`, hover `bg-gray-50/60`
- Badges de status: pills `rounded-full px-2.5 py-0.5 text-[11px] font-semibold`
- Valores financeiros: `tabular-nums font-bold`

**Modais:** `max-w-md`, `rounded-2xl`, formulários com `FormField` existente, botão destrutivo `bg-red-600`.

### 2.5 Sistema de Motion (Framer Motion)

**Dependência a instalar:** `framer-motion`

**Tokens de timing:**
```ts
export const spring = { type: 'spring', stiffness: 300, damping: 24 }
export const entrance = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
export const fastEntrance = { duration: 0.28, ease: 'easeOut' }
```

**Padrão de entrada de página (todas as páginas):**
1. Skeleton shimmer mostrado imediatamente
2. Skeleton dissolve quando dados chegam (`opacity: 0`, 420ms)
3. `PageHeader` desce do topo (`y: -8 → 0`, 280ms, delay 0ms)
4. Cards entram de baixo com stagger 65ms cada (`y: 14 → 0, opacity: 0 → 1`, spring)

**Dashboard especificamente:**
- Sidebar: `x: -18 → 0` (60ms delay)
- Hero card: `y: 14, scale: 0.98 → 1` (960ms delay)
- Número do hero: count-up ease-out-expo (1100ms)
- Sparkline: stagger 38ms por barra, spring overshoot
- Alertas: count-up 0→5 (75ms por número)
- KPI cards: stagger 65ms (1150/1215/1280ms)
- Chart card: (1380ms), barras crescem com spring `cubic-bezier(0.34,1.3,0.64,1)` stagger 52ms

**Hover universal em cards:** `whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}` (150ms ease)

**Troca de página:** `AnimatePresence` + `motion.div` com `initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}`

**Respeitar `prefers-reduced-motion`:** wrapper utilitário que desabilita todos os variants se preferência ativa.

### 2.6 Dark Mode

Toggle no rodapé da sidebar. Classe `dark` no `<html>`.

Tokens adicionais no `@theme` com `.dark` selector:
- Fundo: `#0f1117`
- Cards: `#1a1f2e`, border `rgba(255,255,255,0.07)`
- Sidebar: `#09142e` (navy mais profundo)
- Texto primário: `#f0f4ff`

---

## 3. Arquitetura de Componentes

### Novos / Reescritos

| Componente | Mudança |
|---|---|
| `Layout.tsx` | bg do conteúdo atualizado |
| `Sidebar.tsx` | Redesign completo — grupos, avatar, motion |
| `PageHeader.tsx` | Estilo atualizado, motion entrance |
| `StatCard.tsx` | Variantes atualizadas, Framer Motion hover |
| `AnimatedNumber` | Novo — count-up com ease-out-expo |
| `MotionCard` | Novo — wrapper com entrance + hover |
| `pages/dashboard/Dashboard.tsx` | Redesign completo Layout J |

### Mantidos (apenas recebem novos StatCards/motion)

Todas as páginas existentes (ContasPagar, ContasReceber, Verbas, Compras, FluxoCaixa, CanaisVenda, CalendarioFinanceiro, Alertas, Lançamentos) recebem:
1. `PageHeader` atualizado
2. `StatCards` com novos variants
3. Entrance animation via `MotionCard`

---

## 4. Ordem de Implementação

1. `npm install framer-motion`
2. Criar `src/lib/motion.ts` — tokens e utilitários
3. `index.css` — atualizar fundo, dark mode tokens
4. `Layout.tsx` — bg atualizado
5. `Sidebar.tsx` — redesign completo
6. `PageHeader.tsx` — novo estilo + motion
7. `StatCard.tsx` — novos variants + Framer hover
8. `AnimatedNumber.tsx` — componente novo
9. `MotionCard.tsx` — wrapper de entrance
10. `Dashboard.tsx` — Layout J completo com hero, motion, chart
11. Páginas internas (8 páginas) — StatCards + motion entrance
12. Dark mode toggle + CSS tokens
