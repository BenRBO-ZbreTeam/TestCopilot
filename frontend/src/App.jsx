import { createContext, useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import Dashboard from './pages/Dashboard'
import Scan from './pages/Scan'
import Stock from './pages/Stock'
import { ProductsList, ProductDetail } from './pages/Products'
import History from './pages/History'
import Settings from './pages/Settings'
import { useToast } from './hooks/useToast'
import { api } from './hooks/useApi'

export const AppContext = createContext({})

export default function App() {
  const toast = useToast()
  const [lowStockCount, setLowStockCount] = useState(0)

  // Récupérer le nombre de produits en stock bas
  useEffect(() => {
    async function fetchLowStock() {
      try {
        const stats = await api.get('/movements/stats')
        setLowStockCount(stats.low_stock_count || 0)
      } catch { /* silencieux */ }
    }
    fetchLowStock()
    const interval = setInterval(fetchLowStock, 30000) // Refresh toutes les 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <AppContext.Provider value={{ toast, setLowStockCount }}>
      <BrowserRouter>
        <Layout lowStockCount={lowStockCount}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
        <ToastContainer toasts={toast.toasts} />
      </BrowserRouter>
    </AppContext.Provider>
  )
}
