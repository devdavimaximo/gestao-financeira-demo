import { useEffect, useState } from 'react';
import { transactionsApi } from '../services/api';
import type { Transaction } from '../types';

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    transactionsApi.getAll()
      .then(setTransactions)
      .catch(() => setError('Erro ao carregar transações'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta transação?')) return;
    await transactionsApi.delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Transações</h2>
        <button style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '10px 18px', cursor: 'pointer', fontWeight: 600
        }}>
          + Nova Transação
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Descrição', 'Categoria', 'Conta', 'Data', 'Tipo', 'Valor', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0
              ? <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Nenhuma transação encontrada</td></tr>
              : transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1e293b' }}>{t.description}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px', fontSize: '13px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.categoryColor }} />
                      {t.categoryName}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '14px' }}>{t.accountName}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '14px' }}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                      background: t.type === 'Income' ? '#dcfce7' : t.type === 'Expense' ? '#fee2e2' : '#e0e7ff',
                      color: t.type === 'Income' ? '#16a34a' : t.type === 'Expense' ? '#dc2626' : '#4338ca',
                    }}>
                      {t.type === 'Income' ? 'Receita' : t.type === 'Expense' ? 'Despesa' : 'Transferência'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: t.type === 'Income' ? '#22c55e' : '#ef4444' }}>
                    {t.type === 'Income' ? '+' : '-'}{currency(t.amount)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px' }}
                      title="Excluir"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
