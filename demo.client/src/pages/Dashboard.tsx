import { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import type { DashboardSummary } from '../types';

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.getSummary()
      .then(setData)
      .catch(() => setError('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!data) return null;

  const cards = [
    { label: 'Receitas', value: data.totalIncome, color: '#22c55e' },
    { label: 'Despesas', value: data.totalExpenses, color: '#ef4444' },
    { label: 'Saldo Líquido', value: data.netBalance, color: data.netBalance >= 0 ? '#6366f1' : '#f97316' },
    { label: 'Patrimônio Total', value: data.totalAssets, color: '#3b82f6' },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', color: '#1e293b' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${card.color}`
          }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: card.color }}>{currency(card.value)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>Top Categorias de Despesas</h3>
          {data.topExpenseCategories.length === 0
            ? <p style={{ color: '#94a3b8' }}>Nenhuma despesa no período</p>
            : data.topExpenseCategories.map(c => (
              <div key={c.categoryName} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                    {c.categoryName}
                  </span>
                  <span style={{ color: '#64748b' }}>{c.percentage}% · {currency(c.amount)}</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${c.percentage}%`, background: c.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))
          }
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#374151' }}>Transações Recentes</h3>
          {data.recentTransactions.length === 0
            ? <p style={{ color: '#94a3b8' }}>Nenhuma transação no período</p>
            : data.recentTransactions.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{t.description}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{t.categoryName} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <span style={{ fontWeight: 600, color: t.type === 'Income' ? '#22c55e' : '#ef4444' }}>
                  {t.type === 'Income' ? '+' : '-'}{currency(t.amount)}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
