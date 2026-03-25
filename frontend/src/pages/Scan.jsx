import { useState, useEffect, useContext } from 'react'
import { ScanLine, Plus, TrendingUp, TrendingDown, Package, X, ChevronDown } from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import ProductModal from '../components/ProductModal'
import { api } from '../hooks/useApi'
import { AppContext } from '../App'

const MODES = [
  { id: 'entry', label: 'Entrée stock', icon: TrendingUp, color: 'var(--success)' },
  { id: 'exit', label: 'Sortie stock', icon: TrendingDown, color: 'var(--danger)' },
]

export default function Scan() {
  const { toast } = useContext(AppContext)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [mode, setMode] = useState('entry')
  const [product, setProduct] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [restaurantId, setRestaurantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [newProductEan, setNewProductEan] = useState(null)
  const [manualEan, setManualEan] = useState('')

  useEffect(() => {
    api.get('/restaurants').then(setRestaurants).catch(console.error)
  }, [])

  async function handleScan(ean) {
    setScannerOpen(false)
    await lookupProduct(ean)
  }

  async function lookupProduct(ean) {
    try {
      const data = await api.get(`/products/ean/${ean}`)
      if (data.found) {
        setProduct(data.product)
        toast.success(`Produit trouvé : ${data.product.name}`)
      } else {
        setNewProductEan(ean)
        toast.info(`Code EAN ${ean} inconnu. Créez la fiche produit.`)
      }
    } catch {
      setNewProductEan(ean)
    }
  }

  async function handleManualLookup(e) {
    e.preventDefault()
    if (!manualEan.trim()) return
    await lookupProduct(manualEan.trim())
    setManualEan('')
  }

  async function handleSubmit() {
    if (!product) return
    if (mode === 'exit' && !restaurantId) {
      toast.error('Sélectionnez un restaurant')
      return
    }
    if (quantity <= 0) {
      toast.error('La quantité doit être supérieure à 0')
      return
    }

    setLoading(true)
    try {
      const result = await api.post('/movements', {
        product_id: product.id,
        type: mode,
        quantity: parseInt(quantity),
        restaurant_id: mode === 'exit' ? parseInt(restaurantId) : null,
        notes: notes || null,
      })

      const verb = mode === 'entry' ? 'Entrée' : 'Sortie'
      toast.success(`${verb} enregistrée — Nouveau stock : ${result.new_stock} ${product.unit}`)

      // Reset pour le prochain scan
      setProduct(null)
      setQuantity(1)
      setNotes('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleProductCreated(created) {
    setNewProductEan(null)
    setProduct(created)
    toast.success(`Produit "${created.name}" créé`)
  }

  const ModeIcon = MODES.find(m => m.id === mode)?.icon || TrendingUp
  const modeColor = MODES.find(m => m.id === mode)?.color

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Scanner</h1>
        <p className="page-subtitle">Entrée / Sortie de stock</p>
      </div>

      <div className="page-body">
        {/* Sélecteur de mode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                padding: '14px 10px',
                borderRadius: 'var(--radius)',
                border: `2px solid ${mode === m.id ? m.color : 'var(--border)'}`,
                background: mode === m.id ? (m.id === 'entry' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'var(--bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <m.icon size={22} color={mode === m.id ? m.color : 'var(--text-secondary)'} strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: 600, color: mode === m.id ? m.color : 'var(--text-secondary)' }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>

        {/* Bouton scanner */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginBottom: 12, fontSize: 17 }}
          onClick={() => setScannerOpen(true)}
        >
          <ScanLine size={22} />
          Ouvrir le scanner
        </button>

        {/* Saisie manuelle EAN */}
        <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            className="input-field"
            placeholder="Saisir un code EAN manuellement"
            value={manualEan}
            onChange={e => setManualEan(e.target.value)}
            inputMode="numeric"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
            OK
          </button>
        </form>

        {/* Produit sélectionné */}
        {product && (
          <div className="card slide-up" style={{ marginBottom: 20 }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={18} color="var(--text-secondary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {product.brand ? `${product.brand} · ` : ''}{product.category}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setProduct(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '14px 16px' }}>
              {/* Stock actuel */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Stock actuel</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {product.quantity} {product.unit}
                </span>
              </div>

              {/* Restaurant (sortie uniquement) */}
              {mode === 'exit' && (
                <div className="form-group">
                  <label className="form-label">Restaurant *</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="input-field"
                      value={restaurantId}
                      onChange={e => setRestaurantId(e.target.value)}
                      style={{ appearance: 'none', paddingRight: 36 }}
                    >
                      <option value="">Sélectionner un restaurant</option>
                      {restaurants.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-tertiary)', pointerEvents: 'none'
                    }} />
                  </div>
                </div>
              )}

              {/* Quantité */}
              <div className="form-group">
                <label className="form-label">Quantité ({product.unit})</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 44, height: 44, padding: 0, fontSize: 20, flexShrink: 0 }}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  >−</button>
                  <input
                    className="input-field"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 44, height: 44, padding: 0, fontSize: 20, flexShrink: 0 }}
                    onClick={() => setQuantity(q => q + 1)}
                  >+</button>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Note (optionnel)</label>
                <input
                  className="input-field"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Livraison fournisseur X"
                />
              </div>

              {/* Bouton valider */}
              <button
                className={`btn btn-lg`}
                style={{
                  width: '100%',
                  background: modeColor,
                  color: 'white',
                  opacity: loading ? .7 : 1,
                }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <span className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,.3)' }} /> : <ModeIcon size={18} />}
                {mode === 'entry' ? `Enregistrer l'entrée (+${quantity})` : `Enregistrer la sortie (−${quantity})`}
              </button>
            </div>
          </div>
        )}

        {/* Placeholder si rien sélectionné */}
        {!product && (
          <div className="empty-state" style={{ marginTop: 8 }}>
            <ScanLine size={48} />
            <h3>Aucun produit sélectionné</h3>
            <p>Scannez un code-barres ou saisissez un EAN pour commencer.</p>
          </div>
        )}
      </div>

      {/* Scanner caméra */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Modal création produit */}
      {newProductEan && (
        <ProductModal
          prefillEan={newProductEan}
          onClose={() => setNewProductEan(null)}
          onSaved={handleProductCreated}
        />
      )}
    </div>
  )
}
