interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header style={{
      height: '60px',
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <button
        onClick={onMenuClick}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
        Gestão Financeira
      </h1>
    </header>
  );
}
