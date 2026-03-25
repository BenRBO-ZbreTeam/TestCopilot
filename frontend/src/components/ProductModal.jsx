import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '../hooks/useApi'

const CATEGORIES = ['Alimentation', 'Boissons', 'Produits frais', 'Surgelés', 'Épicerie', 'Hygiène', 'Entretien', 'Emballages', 'Divers']
const UNITS = ['unité', 'kg', 'g', 'L', 'cL', 'mL', 'boîte', 'carton', 'bouteille', 'sachet', 'lot', 'palette']

export default function ProductModal({ product, prefillEan, onClose, onSaved }) {
  const isNew = !product?.id
  const [form, setForm] = useState({
    ean_code: '',
    name: '',
    description: '',
    brand: '',
    unit: 'unité',
    category: 'Divers',
    min_stock: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        ean_code: product.ean_code || '',
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        unit: product.unit || 'unité',
        category: product.category || 'Divers',
        min_stock: product.min_stock || 0,
      })
    } else if (prefillEan) {
      setForm(prev => ({ ...prev, ean_code: prefillEan }))
      // Auto-lookup sur Open Food Facts
      lookupEan(prefillEan)
    }
  }, [product, prefillEan])

  async function lookupEan(ean) {
    if (!ean || ean.length < 8) return
    setLookingUp(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product
        setForm(prev => ({
          ...prev,
          name: prev.name || p.product_name_fr || p.product_name || '',
          brand: prev.brand || p.brands || '',
          description: prev.description || p.generic_name_fr || p.generic_name || '',
        }))
      }
    } catch {
      // Silencieux si pas de réseau
    } finally {
      setLookingUp(false)
    }
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est requis'); return }

    setLoading(true)
    setError('')
    try {
      let saved
      if (isNew) {
        saved = await api.post('/products', form)
      } else {
        saved = await api.put(`/products/${product.id}`, form)
      }
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Nouveau produit' : 'Modifier le produit'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Code EAN / Barcode</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  value={form.ean_code}
                  onChange={e => set('ean_code', e.target.value)}
                  onBlur={e => !product && lookupEan(e.target.value)}
                  placeholder="Ex: 3017620422003"
                  type="text"
                  inputMode="numeric"
                />
                {lookingUp && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                  </span>
                )}
              </div>
              <span className="form-hint">Facultatif. La fiche est auto-complétée si possible.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nom du produit *</label>
              <input
                className={`input-field ${!form.name && error ? 'error' : ''}`}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ex: Huile d'olive extra vierge"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Marque</label>
              <input
                className="input-field"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                placeholder="Ex: Maille, Heinz..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="input-field"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Description optionnelle"
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unité</label>
                <select className="input-field" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Stock minimum (alerte)</label>
              <input
                className="input-field"
                type="number"
                min={0}
                value={form.min_stock}
                onChange={e => set('min_stock', parseInt(e.target.value) || 0)}
              />
              <span className="form-hint">Déclenche une alerte quand le stock descend sous ce seuil.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {isNew ? 'Créer le produit' : 'Enregistrer'}
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
