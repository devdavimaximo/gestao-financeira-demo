import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Units from './pages/units/Units';
import Users from './pages/users/Users';

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 py-16 text-center">
      <Construction size={40} className="text-gray-200 mb-4" strokeWidth={1.25} />
      <h2 className="text-lg font-semibold text-gray-400">{title}</h2>
      <p className="text-sm text-gray-300 mt-1">Módulo em desenvolvimento — Fase 3 / 4</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — all inside Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ComingSoon title="Dashboard Gerencial" />} />
          <Route path="lancamentos"    element={<ComingSoon title="Lançamentos Financeiros" />} />
          <Route path="contas-pagar"   element={<ComingSoon title="Contas a Pagar" />} />
          <Route path="contas-receber" element={<ComingSoon title="Contas a Receber" />} />
          <Route path="verbas"         element={<ComingSoon title="Controle de Verbas" />} />
          <Route path="compras"        element={<ComingSoon title="Controle de Compras" />} />
          <Route path="fluxo-caixa"    element={<ComingSoon title="Fluxo de Caixa" />} />
          <Route path="calendario"     element={<ComingSoon title="Calendário Financeiro" />} />
          <Route path="canais"         element={<ComingSoon title="Canais de Venda" />} />
          <Route path="alertas"        element={<ComingSoon title="Alertas Financeiros" />} />

          {/* Admin only */}
          <Route
            path="unidades"
            element={
              <ProtectedRoute adminOnly>
                <Units />
              </ProtectedRoute>
            }
          />
          <Route
            path="usuarios"
            element={
              <ProtectedRoute adminOnly>
                <Users />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
