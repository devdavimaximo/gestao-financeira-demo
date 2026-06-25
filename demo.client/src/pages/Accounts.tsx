import { useEffect, useState } from 'react';
import { accountsApi } from '../services/api';
import type { Account } from '../types';

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const accountTypeLabel: Record<string, string> = {
  Checking: 'Conta Corrente',
  Savings: 'Poupança',
  CreditCard: 'Cartão de Crédito',
  Investment: 'Investimento',
  Cash: 'Dinheiro',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountsApi.getAll()
      .then(setAccounts)
      .catch(() => setError('Erro ao carregar contas'))
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Contas</h2>
        <button style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '10px 18px', cursor: 'pointer', fontWeight: 600
        }}>
          + Nova Conta
        </button>
      </div>

      <div style={{ background: '#6366f1', color: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <p style={{ margin: '0 0 4px', opacity: 0.8, fontSize: '14px' }}>Saldo Total</p>
        <p style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>{currency(totalBalance)}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {accounts.map(account => (
          <div key={account.id} style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            opacity: account.isActive ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>
                {accountTypeLabel[account.type] ?? account.type}
              </span>
              {!account.isActive && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Inativa</span>}
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '16px', color: '#1e293b' }}>{account.name}</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: account.balance >= 0 ? '#22c55e' : '#ef4444' }}>
              {currency(account.balance)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
