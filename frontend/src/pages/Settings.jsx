import { useState, useEffect, useContext } from 'react'
import { Bell, Plus, Trash2, Mail, Check, X, ChevronDown, Package } from 'lucide-react'
import { api } from '../hooks/useApi'
import { AppContext } from '../App'

export default function Settings() {
  const { toast } = useContext(AppContext)
  const [alerts, setAlerts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddAlert, setShowAddAlert] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  // Form nouvelle alerte
  const [alertForm, setAlertForm] = useState({ product_id: '', min_quantity: 0, emails: '', is_active: true })
  const [alertLoading, setAlertLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/alerts'),
      api.get('/products'),
    ]).then(([a, p]) => {
      setAlerts(a)
      setProducts(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleAddAlert(e) {
    e.preventDefault()
    if (!alertForm.product_id || !alertForm.emails.trim()) {
      toast.error('Sélectionnez un produit et renseignez au moins un email')
      return
    }

    setAlertLoading(true)
    try {
      const saved = await api.post('/alerts', {
        product_id: parseInt(alertForm.product_id),
        min_quantity: parseInt(alertForm.min_quantity) || 0,
        emails: alertForm.emails,
        is_active: alertForm.is_active,
      })
      setAlerts(prev => {
        const idx = prev.findIndex(a => a.product_id === saved.product_id)
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
        return [saved, ...prev]
      })
      setShowAddAlert(false)
      setAlertForm({ product_id: '', min_quantity: 0, emails: '', is_active: true })
      toast.success('Alerte configurée')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAlertLoading(false)
    }
  }

  async function toggleAlert(alert) {
    try {
      await api.put(`/alerts/${alert.id}`, { is_active: !alert.is_active })
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: !a.is_active } : a))
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function deleteAlert(id) {
    try {
      await api.delete(`/alerts/${id}`)
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('Alerte supprimée')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function sendTestEmail(e) {
    e.preventDefault()
    if (!testEmail.trim()) return
    setTestLoading(true)
    try {
      await api.post('/alerts/test-email', { email: testEmail })
      toast.success('Email de test envoyé !')
    } catch (err) {
      toast.error(`Erreur : ${err.message}`)
    } finally {
      setTestLoading(false)
    }
  }

  // Produits sans alerte configurée
  const productsWithoutAlert = products.filter(
    p => !alerts.find(a => a.product_id === p.id)
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Alertes et notifications</p>
      </div>

      <div className="page-body">
        {/* Section alertes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: .6 }}>
            Alertes de stock bas
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddAlert(true)} style={{ gap: 4 }}>
            <Plus size={14} /> Nouvelle alerte
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : alerts.length === 0 ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="empty-state" style={{ padding: 32 }}>
              <Bell size={36} />
              <h3>Aucune alerte configurée</h3>
              <p>Configurez des alertes email pour être notifié quand un stock devient trop bas.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAddAlert(true)}>
                <Plus size={16} /> Créer une alerte
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 24 }}>
            {alerts.map((alert, i) => (
              <div key={alert.id} style={{
                padding: '14px 16px',
                borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{alert.product_name}</span>
                    {alert.is_low_stock && (
                      <span className="badge badge-danger">Stock bas</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {/* Toggle actif/inactif */}
                    <button
                      onClick={() => toggleAlert(alert)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: alert.is_active ? 'var(--text)' : 'var(--border-strong)',
                        border: 'none', cursor: 'pointer',
                        position: 'relative', transition: 'background .2s',
                        flexShrink: 0,
                      }}
                      title={alert.is_active ? 'Désactiver' : 'Activer'}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: alert.is_active ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: 'white',
                        transition: 'left .2s',
                      }} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => deleteAlert(alert.id)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span>
                    Stock actuel : <strong style={{ color: alert.current_stock <= alert.min_quantity ? 'var(--danger)' : 'var(--text)' }}>
                      {alert.current_stock} {alert.unit}
                    </strong>
                  </span>
                  <span>Seuil : <strong>{alert.min_quantity} {alert.unit}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Mail size={11} />
                    {alert.emails}
                  </span>
                </div>
                {!alert.is_active && (
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Alerte désactivée
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section test email */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 12 }}>
          Configuration email
        </div>
        <div className="card" style={{ padding: '16px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Configurez les variables SMTP dans le fichier <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>.env</code> du backend. Testez l'envoi ci-dessous.
          </p>
          <form onSubmit={sendTestEmail} style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              type="email"
              placeholder="email@test.fr"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary" disabled={testLoading} style={{ flexShrink: 0 }}>
              {testLoading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Mail size={14} />}
              Tester
            </button>
          </form>
        </div>

        {/* Restaurants */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 12 }}>
          Restaurants
        </div>
        <div className="card">
          {['Monsieur MOUETTE', 'GIGIO', 'TIGER Club', 'CHEZ HENRI'].map((r, i) => (
            <div key={r} style={{
              padding: '13px 16px',
              borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
              fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Modal nouvelle alerte */}
      {showAddAlert && (
        <div className="modal-overlay" onClick={() => setShowAddAlert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle alerte</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddAlert(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddAlert}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Produit *</label>
                  <select
                    className="input-field"
                    value={alertForm.product_id}
                    onChange={e => setAlertForm(prev => ({ ...prev, product_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionner un produit</option>
                    {productsWithoutAlert.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (stock: {p.quantity} {p.unit})</option>
                    ))}
                  </select>
                  {productsWithoutAlert.length === 0 && (
                    <span className="form-hint">Tous les produits ont déjà une alerte.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Quantité minimum *</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    value={alertForm.min_quantity}
                    onChange={e => setAlertForm(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 0 }))}
                    required
                  />
                  <span className="form-hint">Une alerte sera envoyée quand le stock descend sous ce seuil.</span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Emails de notification *</label>
                  <input
                    className="input-field"
                    type="text"
                    value={alertForm.emails}
                    onChange={e => setAlertForm(prev => ({ ...prev, emails: e.target.value }))}
                    placeholder="email1@ex.fr, email2@ex.fr"
                    required
                  />
                  <span className="form-hint">Séparez plusieurs emails par des virgules.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary btn-lg" disabled={alertLoading}>
                  {alertLoading ? <span className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,.3)' }} /> : null}
                  Créer l'alerte
                </button>
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => setShowAddAlert(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
