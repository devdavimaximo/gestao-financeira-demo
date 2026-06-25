import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import UnitSelector from './UnitSelector';
import {
  LayoutDashboard, Receipt, CreditCard, Wallet, PiggyBank,
  ShoppingCart, TrendingUp, Calendar, BarChart3, Bell,
  Store, Users2, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       icon: LayoutDashboard, path: '/',             end: true },
  { label: 'Lançamentos',     icon: Receipt,         path: '/lancamentos' },
  { label: 'Contas a Pagar',  icon: CreditCard,      path: '/contas-pagar' },
  { label: 'Contas a Receber',icon: Wallet,           path: '/contas-receber' },
  { label: 'Verbas',          icon: PiggyBank,        path: '/verbas' },
  { label: 'Compras',         icon: ShoppingCart,     path: '/compras' },
  { label: 'Fluxo de Caixa',  icon: TrendingUp,       path: '/fluxo-caixa' },
  { label: 'Calendário',      icon: Calendar,         path: '/calendario' },
  { label: 'Canais de Venda', icon: BarChart3,        path: '/canais' },
  { label: 'Alertas',         icon: Bell,             path: '/alertas' },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Unidades', icon: Store,  path: '/unidades' },
  { label: 'Usuários', icon: Users2, path: '/usuarios' },
];

function NavButton({ item, onClick }: { item: NavItem; onClick: () => void }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
          isActive
            ? 'text-white bg-white/10'
            : 'text-white/55 hover:text-white/80 hover:bg-white/5',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1 bottom-1 w-0.75 rounded-r bg-brand-gold" />
          )}
          <item.icon size={16} strokeWidth={1.75} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = user?.fullName?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-white font-bold text-base leading-tight tracking-wide">
          Gestão
        </div>
        <div className="text-[11px] font-semibold tracking-widest uppercase mt-0.5 text-brand-beige">
          Financeira
        </div>
      </div>

      {/* Unit selector */}
      <UnitSelector />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-3">
          {NAV_ITEMS.map(item => (
            <li key={item.path}>
              <NavButton item={item} onClick={onClose} />
            </li>
          ))}

          {isAdmin && (
            <>
              <li className="pt-5 pb-1 px-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
                  Administração
                </span>
              </li>
              {ADMIN_ITEMS.map(item => (
                <li key={item.path}>
                  <NavButton item={item} onClick={onClose} />
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="size-8 rounded-full bg-brand-gold flex items-center justify-center text-brand-navy font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate leading-tight">
              {user?.fullName}
            </div>
            <div className="text-white/40 text-xs truncate">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-white/45 hover:text-white/75 hover:bg-white/5 text-sm transition-colors"
        >
          <LogOut size={14} />
          <span>Sair</span>
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
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-brand-navy text-white shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-60 bg-brand-navy transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          className="absolute top-4 right-4 text-white/50 hover:text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-brand-navy min-h-screen">
        <SidebarContent onClose={() => {}} />
      </aside>
    </>
  );
}
