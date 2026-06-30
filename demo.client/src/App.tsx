import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/shared/toast';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Units from './pages/units/Units';
import Lancamentos from './pages/entries/Lancamentos';
import ContasPagar from './pages/payables/ContasPagar';
import ContasReceber from './pages/receivables/ContasReceber';
import Verbas from './pages/budgets/Verbas';
import Compras from './pages/purchases/Compras';
import Dashboard from './pages/dashboard/Dashboard';
import FluxoCaixa from './pages/cashflow/FluxoCaixa';
import CalendarioFinanceiro from './pages/calendar/CalendarioFinanceiro';
import CanaisVenda from './pages/channels/CanaisVenda';
import Alertas from './pages/alerts/Alertas';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsuarios from './pages/admin/usuarios/AdminUsuarios';
import AdminRoles from './pages/admin/roles/AdminRoles';
import AdminSeguranca from './pages/admin/seguranca/AdminSeguranca';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="lancamentos"    element={<Lancamentos />} />
              <Route path="contas-pagar"   element={<ContasPagar />} />
              <Route path="contas-receber" element={<ContasReceber />} />
              <Route path="verbas"         element={<Verbas />} />
              <Route path="compras"        element={<Compras />} />
              <Route path="fluxo-caixa"    element={<FluxoCaixa />} />
              <Route path="calendario"     element={<CalendarioFinanceiro />} />
              <Route path="canais"         element={<CanaisVenda />} />
              <Route path="alertas"        element={<Alertas />} />

              <Route
                path="unidades"
                element={
                  <ProtectedRoute adminOnly>
                    <Units />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/usuarios"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminUsuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/roles"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminRoles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/seguranca"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminSeguranca />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
