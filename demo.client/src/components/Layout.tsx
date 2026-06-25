import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar open={sidebarOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
