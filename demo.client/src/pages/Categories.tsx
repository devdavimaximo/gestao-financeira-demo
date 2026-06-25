import { useEffect, useState } from 'react';
import { categoriesApi } from '../services/api';
import type { Category } from '../types';

const typeLabel: Record<string, string> = {
  Income: 'Receita',
  Expense: 'Despesa',
  Both: 'Ambos',
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoriesApi.getAll()
      .then(setCategories)
      .catch(() => setError('Erro ao carregar categorias'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta categoria?')) return;
    await categoriesApi.delete(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Categorias</h2>
        <button style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '10px 18px', cursor: 'pointer', fontWeight: 600
        }}>
          + Nova Categoria
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {categories.map(cat => (
          <div key={cat.id} style={{
            background: '#fff', borderRadius: '12px', padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            borderTop: `4px solid ${cat.color}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: cat.color, fontWeight: 700 }}>#</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{cat.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{typeLabel[cat.type]}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '16px' }}
                title="Excluir"
              >
                🗑
              </button>
            </div>
            {cat.description && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#64748b' }}>{cat.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
