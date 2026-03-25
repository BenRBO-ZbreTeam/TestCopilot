import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Search, Filter, X, ChevronDown } from 'lucide-react'
import { api } from '../hooks/useApi'

const PAGE_SIZE = 30

export default function History() {
  const [movements, setMovements] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState([])
  const [filters, setFilters] = useState({ type: '', restaurant_id: '', date_from: '', date_to: '' })
  const [offset, setOffset] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    api.get('/restaurants').then(setRestaurants).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setOffset(0)
    loadMovements(0)
  }, [filters])

  async function loadMovements(off = offset) {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: off })
    if (filters.type) params.set('type', filters.type)
    if (filters.restaurant_id) params.set('restaurant_id', filters.restaurant_id)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)

    try {
      const data = await api.get(`/movements?${params}`)
      if (off === 0) {
        setMovements(data.movements)
      } else {
        setMovements(prev => [...prev, ...data.movements])
      }
      setTotal(data.total)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters({ type: '', restaurant_id: '', date_from: '', date_to: '' })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  // Grouper par date
  const grouped = movements.reduce((acc, m) => {
    const date = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[date]) acc[date] = []
    acc[date].push(m)
    return acc
  }, {})

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Historique</h1>
            <p className="page-subtitle">{loading ? '…' : `${total} mouvement${total > 1 ? 's' : ''}`}</p>
          </div>
          <button
            className={`btn ${hasFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ gap: 6 }}
          >
            <Filter size={14} />
            Filtres
            {hasFilters && <span style={{ background: 'rgba(255,255,255,.3)', borderRadius: 100, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {Object.values(filters).filter(Boolean).length}
            </span>}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Panneau filtres */}
        {showFilters && (
          <div className="card slide-up" style={{ marginBottom: 16, padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Type</label>
                <select className="input-field" value={filters.type} onChange={e => setFilter('type', e.target.value)}>
                  <option value="">Tous</option>
                  <option value="entry">Entrées</option>
                  <option value="exit">Sorties</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Restaurant</label>
                <select className="input-field" value={filters.restaurant_id} onChange={e => setFilter('restaurant_id', e.target.value)}>
                  <option value="">Tous</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Du</label>
                <input className="input-field" type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Au</label>
                <input className="input-field" type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
              </div>
            </div>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ color: 'var(--danger)' }}>
                <X size={14} /> Effacer les filtres
              </button>
            )}
          </div>
        )}

        {/* Liste mouvements groupés */}
        {loading && movements.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={48} />
            <h3>Aucun mouvement</h3>
            <p>{hasFilters ? 'Aucun résultat pour ces filtres.' : 'Aucun mouvement enregistré.'}</p>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6,
                  color: 'var(--text-secondary)', marginBottom: 8,
                  textTransform: 'capitalize'
                }}>
                  {date}
                </div>
                <div className="card">
                  {items.map((m, i) => (
                    <div key={m.id} style={{
                      padding: '12px 16px',
                      borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: m.type === 'entry' ? 'var(--success-bg)' : 'var(--danger-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                          {m.type === 'entry' ? 'Entrée stock' : `Sortie → ${m.restaurant_name}`}
                          {m.notes && ` · ${m.notes}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 700,
                          color: m.type === 'entry' ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {m.type === 'entry' ? '+' : '−'}{m.quantity}
                          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 3 }}>
                            {m.unit}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Charger plus */}
            {movements.length < total && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const newOffset = offset + PAGE_SIZE
                    setOffset(newOffset)
                    loadMovements(newOffset)
                  }}
                  disabled={loading}
                >
                  {loading ? <span className="spinner" /> : 'Charger plus'}
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 4 }}>
                    ({movements.length}/{total})
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
