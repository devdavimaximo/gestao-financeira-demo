import { useEffect, useState } from 'react';
import { budgetsApi } from '../services/api';
import type { Budget } from '../types';

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    budgetsApi.getAll(month, year)
      .then(setBudgets)
      .catch(() => setError('Erro ao carregar orçamentos'))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Orçamentos</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#374151' }}>
            {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '80px', color: '#374151' }} />
          <button style={{
            background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 18px', cursor: 'pointer', fontWeight: 600
          }}>
            + Novo Orçamento
          </button>
        </div>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {budgets.length === 0
            ? <p style={{ color: '#94a3b8' }}>Nenhum orçamento para este período</p>
            : budgets.map(b => {
              const pct = Math.min((b.spentAmount / b.limitAmount) * 100, 100);
              const exceeded = b.spentAmount > b.limitAmount;
              return (
                <div key={b.id} style={{
                  background: '#fff', borderRadius: '12px', padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  borderLeft: `4px solid ${exceeded ? '#ef4444' : b.categoryColor}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{b.name}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{b.categoryName}</p>
                    </div>
                    {exceeded && <span style={{ fontSize: '12px', background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>Excedido</span>}
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '10px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: exceeded ? '#ef4444' : b.categoryColor, borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Gasto: <strong style={{ color: exceeded ? '#ef4444' : '#1e293b' }}>{currency(b.spentAmount)}</strong></span>
                    <span style={{ color: '#64748b' }}>Limite: <strong>{currency(b.limitAmount)}</strong></span>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
