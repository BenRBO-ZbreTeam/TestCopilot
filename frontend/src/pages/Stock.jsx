import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Package, TriangleAlert, ChevronRight, Filter, X } from 'lucide-react'
import { api } from '../hooks/useApi'

export default function Stock() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(searchParams.get('filter') === 'low')

  useEffect(() => {
    api.get('/products/categories').then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (showLowOnly) params.set('low_stock', 'true')

    const timer = setTimeout(() => {
      api.get(`/products?${params}`).then(data => {
        setProducts(data)
        setLoading(false)
      }).catch(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [search, category, showLowOnly])

  const lowCount = products.filter(p => p.is_low_stock).length

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Stock</h1>
            <p className="page-subtitle">
              {loading ? '…' : `${products.length} produit${products.length > 1 ? 's' : ''}`}
              {lowCount > 0 && !showLowOnly && (
                <span style={{ color: 'var(--warning)', marginLeft: 8 }}>· {lowCount} bas</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Filtres */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div className="search-bar">
            <Search size={16} />
            <input
              className="input-field"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <select
                className="input-field"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ appearance: 'none' }}
              >
                <option value="">Toutes catégories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`btn ${showLowOnly ? 'btn-primary' : 'btn-secondary'}`}
              style={{ gap: 6, flexShrink: 0 }}
            >
              <TriangleAlert size={14} />
              Stock bas
            </button>
          </div>
        </div>

        {/* Liste produits */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h3>Aucun produit</h3>
            <p>
              {search || category || showLowOnly
                ? 'Aucun produit ne correspond aux filtres.'
                : 'Commencez par scanner ou créer un produit.'}
            </p>
          </div>
        ) : (
          <div className="card">
            {products.map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: '13px 16px',
                  borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'background .1s',
                }}
                onClick={() => navigate(`/products/${p.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Indicateur stock */}
                <div style={{
                  width: 6,
                  height: 36,
                  borderRadius: 3,
                  background: p.is_low_stock
                    ? 'var(--danger)'
                    : p.quantity > 0
                      ? 'var(--success)'
                      : 'var(--border-strong)',
                  flexShrink: 0,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8, marginTop: 1 }}>
                    <span>{p.category}</span>
                    {p.brand && <span>· {p.brand}</span>}
                    {p.ean_code && <span style={{ color: 'var(--text-tertiary)' }}>· {p.ean_code}</span>}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: p.is_low_stock ? 'var(--danger)' : p.quantity === 0 ? 'var(--text-tertiary)' : 'var(--text)',
                  }}>
                    {p.quantity}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 3 }}>
                      {p.unit}
                    </span>
                  </div>
                  {p.is_low_stock && (
                    <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>
                      MIN {p.min_stock}
                    </div>
                  )}
                </div>

                <ChevronRight size={14} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
