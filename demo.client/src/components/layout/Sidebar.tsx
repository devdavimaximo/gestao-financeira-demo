import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import UnitSelector from './UnitSelector';
import {
  LayoutDashboard, Receipt, CreditCard, Wallet, PiggyBank,
  ShoppingCart, TrendingUp, Calendar, BarChart3, Bell,
  Store, Users2, LogOut, Menu, X, Moon, Sun, ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUnit } from '../../contexts/UnitContext';
import { alertsApi } from '../../services/api';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard',   icon: LayoutDashboard, path: '/', end: true },
      { label: 'Lançamentos', icon: Receipt,         path: '/lancamentos' },
      { label: 'Alertas',     icon: Bell,            path: '/alertas' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Contas a Pagar',   icon: CreditCard,  path: '/contas-pagar' },
      { label: 'Contas a Receber', icon: Wallet,      path: '/contas-receber' },
      { label: 'Verbas',           icon: PiggyBank,   path: '/verbas' },
      { label: 'Fluxo de Caixa',   icon: TrendingUp,  path: '/fluxo-caixa' },
    ],
  },
  {
    label: 'Operações',
    items: [
      { label: 'Compras',        icon: ShoppingCart, path: '/compras' },
      { label: 'Canais de Venda',icon: BarChart3,    path: '/canais' },
      { label: 'Calendário',     icon: Calendar,     path: '/calendario' },
    ],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Unidades', icon: Store,  path: '/unidades' },
  { label: 'Usuários', icon: Users2, path: '/usuarios' },
];

function NavButton({ item, onClick, badge }: {
  item: NavItem;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 py-2 rounded-lg text-sm transition-all duration-150',
          isActive
            ? 'sidebar-nav-active text-white bg-white/12 font-semibold border-l-2 border-brand-gold pl-2.5 pr-3'
            : 'text-white/50 hover:text-white/80 hover:bg-white/6 px-3',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={15}
            strokeWidth={isActive ? 2.25 : 1.75}
            className={cn('shrink-0 transition-all', isActive ? 'text-white' : '')}
          />
          <span className="flex-1 leading-none">{item.label}</span>
          {badge != null && badge > 0 && (
            <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-brand-gold text-brand-navy text-[10px] font-bold flex items-center justify-center leading-none tabular-nums">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const { selectedUnitId } = useUnit();
  const { isDark, toggle: toggleDark } = useTheme();
  const navigate = useNavigate();

  const { data: alertCount } = useQuery({
    queryKey: ['alerts-count', selectedUnitId],
    queryFn: () => alertsApi.getUnreadCount(selectedUnitId),
    refetchInterval: 60_000,
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = user?.fullName?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* ── Decorative wave arcs — center far below sidebar, gentle curves only ── */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 0 }}
        aria-hidden
      >
        {[
          { size: 480,  color: 'rgba(80,160,230,0.22)' },
          { size: 640,  color: 'rgba(80,160,230,0.15)' },
          { size: 800,  color: 'rgba(80,160,230,0.10)' },
          { size: 960,  color: 'rgba(80,160,230,0.06)' },
          { size: 1120, color: 'rgba(80,160,230,0.04)' },
        ].map(({ size, color }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Gestão Financeira" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          <div>
            <div className="text-white font-black text-[13px] leading-tight tracking-tight">
              Gestão Financeira
            </div>
            <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/35 mt-0.5">
              Plataforma Empresarial
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 75%, transparent)' }} />

      {/* Unit selector */}
      <div className="px-3 py-2.5">
        <UnitSelector />
      </div>

      {/* Divider */}
      <div className="mx-4 h-px shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 75%, transparent)' }} />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Navegação principal">
        <div className="space-y-5 px-3">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div className="px-3 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/22">
                  {group.label}
                </span>
              </div>
              <ul className="space-y-0.5">
                {group.items.map(item => (
                  <li key={item.path}>
                    <NavButton
                      item={item}
                      onClick={onClose}
                      badge={item.path === '/alertas' ? (alertCount?.count ?? 0) : undefined}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {isAdmin && (
            <div>
              <div className="px-3 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/22">
                  Administração
                </span>
              </div>
              <ul className="space-y-0.5">
                {ADMIN_ITEMS.map(item => (
                  <li key={item.path}>
                    <NavButton item={item} onClick={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 75%, transparent)' }} />

      {/* User footer */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-0.5 rounded-lg hover:bg-white/6 transition-colors cursor-default">
          <div className="size-8 rounded-full bg-brand-gold flex items-center justify-center text-brand-navy font-black text-[11px] shrink-0 select-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[11px] font-semibold truncate leading-tight">
              {user?.fullName}
            </div>
            <div className="text-white/35 text-[10px] truncate leading-tight mt-0.5">
              {user?.email ?? user?.role}
            </div>
          </div>
          <ChevronDown size={12} className="text-white/25 shrink-0" />
        </div>
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/38 hover:text-white/70 hover:bg-white/6 text-xs transition-colors"
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
          <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/38 hover:text-white/70 hover:bg-white/6 text-xs transition-colors"
        >
          <LogOut size={13} />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-[#0c1a35] text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-60 bg-[#0c1a35] shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            aria-label="Menu lateral"
          >
            <button
              className="absolute top-4 right-3 w-7 h-7 rounded-lg text-white/45 hover:text-white hover:bg-white/8 flex items-center justify-center transition-colors"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={15} />
            </button>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 bg-[#0c1a35] h-screen sticky top-0"
        aria-label="Menu lateral"
      >
        <SidebarContent onClose={() => {}} />
      </aside>
    </>
  );
}
