import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, TrendingUp, TrendingDown, TriangleAlert, ScanLine, ChevronRight } from 'lucide-react'
import { api } from '../hooks/useApi'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [lowStockItems, setLowStockItems] = useState([])
  const [recentMovements, setRecentMovements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, m] = await Promise.all([
          api.get('/movements/stats'),
          api.get('/movements?limit=5'),
        ])
        setStats(s)
        setRecentMovements(m.movements)

        if (s.low_stock_count > 0) {
          const p = await api.get('/products?low_stock=true')
          setLowStockItems(p.slice(0, 5))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{today}</p>
        </div>
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
      </div>

      <div className="page-body">
        {/* Bouton scan rapide */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginBottom: 20, gap: 8 }}
          onClick={() => navigate('/scan')}
        >
          <ScanLine size={20} />
          Scanner un produit
        </button>

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Produits</div>
            <div className="stat-value">{stats?.total_products ?? '—'}</div>
            <div className="stat-meta">en catalogue</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unités en stock</div>
            <div className="stat-value">{stats?.total_stock_quantity ?? '—'}</div>
            <div className="stat-meta">total</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Entrées today</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              +{stats?.today?.entries?.total_qty ?? 0}
            </div>
            <div className="stat-meta">{stats?.today?.entries?.count ?? 0} opération(s)</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sorties today</div>
            <div className="stat-value" style={{ color: stats?.today?.exits?.total_qty > 0 ? 'var(--danger)' : undefined }}>
              -{stats?.today?.exits?.total_qty ?? 0}
            </div>
            <div className="stat-meta">{stats?.today?.exits?.count ?? 0} opération(s)</div>
          </div>
        </div>

        {/* Alertes stock bas */}
        {lowStockItems.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TriangleAlert size={16} color="var(--warning)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Stock bas</span>
                <span className="badge badge-warning">{stats.low_stock_count}</span>
              </div>
              <button
                onClick={() => navigate('/stock?filter=low')}
                style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
              >
                Voir tout <ChevronRight size={14} />
              </button>
            </div>
            {lowStockItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: '11px 16px',
                  borderBottom: i < lowStockItems.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/products/${item.id}`)}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>
                    {item.quantity} {item.unit}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    min. {item.min_stock}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Derniers mouvements */}
        <div className="card">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Derniers mouvements</span>
            <button
              onClick={() => navigate('/history')}
              style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              Historique <ChevronRight size={14} />
            </button>
          </div>
          {recentMovements.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <Package size={32} />
              <h3>Aucun mouvement</h3>
              <p>Scannez un produit pour commencer.</p>
            </div>
          ) : (
            recentMovements.map((m, i) => (
              <div key={m.id} style={{
                padding: '11px 16px',
                borderBottom: i < recentMovements.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: m.type === 'entry' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {m.type === 'entry'
                    ? <TrendingUp size={14} color="var(--success)" />
                    : <TrendingDown size={14} color="var(--danger)" />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.product_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.type === 'entry' ? 'Entrée' : `Sortie → ${m.restaurant_name}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: m.type === 'entry' ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {m.type === 'entry' ? '+' : '-'}{m.quantity} {m.unit}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
