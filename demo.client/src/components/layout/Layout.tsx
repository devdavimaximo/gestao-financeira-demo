import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();

  // Admin pages manage their own padding/bg and need the full main-area width
  const isFullWidth = location.pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen bg-[#f1f3f8] dark:bg-[#0f1117]">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        {isFullWidth ? (
          <AnimatePresence mode="wait" initial={false}>
            <Outlet key={location.pathname} />
          </AnimatePresence>
        ) : (
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
            <AnimatePresence mode="wait" initial={false}>
              <Outlet key={location.pathname} />
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
