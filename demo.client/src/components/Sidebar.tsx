import { NavLink } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transacoes', label: 'Transações', icon: '💸' },
  { to: '/contas', label: 'Contas', icon: '🏦' },
  { to: '/categorias', label: 'Categorias', icon: '🏷️' },
  { to: '/orcamentos', label: 'Orçamentos', icon: '📋' },
];

export default function Sidebar({ open }: SidebarProps) {
  if (!open) return null;

  return (
    <nav style={{
      width: '220px',
      background: '#1e293b',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      flexShrink: 0,
    }}>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            color: isActive ? '#fff' : '#94a3b8',
            background: isActive ? '#334155' : 'transparent',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
            borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
            transition: 'all 0.15s',
          })}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
