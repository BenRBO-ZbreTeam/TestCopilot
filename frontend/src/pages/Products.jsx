import { useState, useEffect, useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, Plus, Package, Edit2, Trash2, ChevronLeft, TrendingUp, TrendingDown, Bell, X } from 'lucide-react'
import ProductModal from '../components/ProductModal'
import { api } from '../hooks/useApi'
import { AppContext } from '../App'

// Vue liste des produits
export function ProductsList() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      api.get(`/products${params}`).then(data => {
        setProducts(data)
        setLoading(false)
      }).catch(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [search])

  function handleSaved(product) {
    setShowModal(false)
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === product.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = product; return n }
      return [product, ...prev]
    })
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Produits</h1>
            <p className="page-subtitle">{loading ? '…' : `${products.length} produit${products.length > 1 ? 's' : ''}`}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ gap: 6 }}>
            <Plus size={16} /> Nouveau
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <Search size={16} />
          <input
            className="input-field"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h3>Aucun produit</h3>
            <p>{search ? 'Aucun résultat.' : 'Créez votre premier produit.'}</p>
            {!search && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                <Plus size={16} /> Nouveau produit
              </button>
            )}
          </div>
        ) : (
          <div className="card">
            {products.map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: '13px 16px',
                  borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'background .1s',
                }}
                onClick={() => navigate(`/products/${p.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, marginTop: 1, flexWrap: 'wrap' }}>
                    <span className="tag">{p.category}</span>
                    {p.ean_code && <span className="tag">{p.ean_code}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: p.is_low_stock ? 'var(--danger)' : p.quantity === 0 ? 'var(--text-tertiary)' : 'var(--text)',
                  }}>
                    {p.quantity} {p.unit}
                  </div>
                </div>
                <TrendingUp size={14} color="var(--text-tertiary)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </div>
  )
}

// Vue détail d'un produit
export function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useContext(AppContext)
  const [product, setProduct] = useState(null)
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/movements?product_id=${id}&limit=20`)
    ]).then(([p, m]) => {
      setProduct(p)
      setMovements(m.movements)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/products/${id}`)
      toast.success('Produit supprimé')
      navigate('/stock')
    } catch (err) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }
  if (!product) return <div className="page-body"><p>Produit introuvable.</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, marginBottom: 8 }}
        >
          <ChevronLeft size={16} /> Retour
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>{product.name}</h1>
            <p className="page-subtitle">{product.brand ? `${product.brand} · ` : ''}{product.category}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-icon" onClick={() => setShowEdit(true)} title="Modifier">
              <Edit2 size={16} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowDelete(true)} title="Supprimer" style={{ color: 'var(--danger)' }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stock actuel */}
        <div className="card" style={{ marginBottom: 16, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-secondary)', marginBottom: 4 }}>
                STOCK ACTUEL
              </div>
              <div style={{
                fontSize: 40, fontWeight: 800, letterSpacing: -1,
                color: product.is_low_stock ? 'var(--danger)' : 'var(--text)',
              }}>
                {product.quantity}
                <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 6 }}>
                  {product.unit}
                </span>
              </div>
              {product.is_low_stock && (
                <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                  ⚠ Sous le minimum ({product.min_stock} {product.unit})
                </div>
              )}
            </div>
            {product.ean_code && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>EAN</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{product.ean_code}</div>
              </div>
            )}
          </div>
        </div>

        {/* Infos */}
        <div className="card" style={{ marginBottom: 16 }}>
          {[
            ['Catégorie', product.category],
            ['Unité', product.unit],
            product.description && ['Description', product.description],
            product.brand && ['Marque', product.brand],
            ['Stock minimum', `${product.min_stock} ${product.unit}`],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 16px', borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Créé le</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {new Date(product.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Historique mouvements */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>
          Derniers mouvements
        </div>
        {movements.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <p>Aucun mouvement enregistré.</p>
          </div>
        ) : (
          <div className="card">
            {movements.map((m, i) => (
              <div key={m.id} style={{
                padding: '11px 16px',
                borderBottom: i < movements.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: m.type === 'entry' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {m.type === 'entry'
                    ? <TrendingUp size={13} color="var(--success)" />
                    : <TrendingDown size={13} color="var(--danger)" />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {m.type === 'entry' ? 'Entrée' : `Sortie → ${m.restaurant_name}`}
                  </div>
                  {m.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.notes}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: m.type === 'entry' ? 'var(--success)' : 'var(--danger)' }}>
                    {m.type === 'entry' ? '+' : '−'}{m.quantity}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <ProductModal
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={p => { setProduct(p); setShowEdit(false); toast.success('Produit mis à jour') }}
        />
      )}

      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Supprimer le produit</h2>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
                Voulez-vous supprimer <strong>{product.name}</strong> ? Cette action est irréversible et supprimera également tout l'historique de mouvements.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-lg" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,.3)' }} /> : null}
                Supprimer
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => setShowDelete(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
