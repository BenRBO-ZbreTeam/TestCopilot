import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ScanLine, Package, History, Settings, TriangleAlert } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scan', label: 'Scanner', icon: ScanLine },
  { path: '/stock', label: 'Stock', icon: Package },
  { path: '/history', label: 'Historique', icon: History },
  { path: '/settings', label: 'Paramètres', icon: Settings },
]

export default function Layout({ children, lowStockCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="app-layout">
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Stock Logistique</h1>
          <p>4 restaurants</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} strokeWidth={isActive(path) ? 2.2 : 1.8} />
              <span>{label}</span>
              {path === '/stock' && lowStockCount > 0 && (
                <span className="nav-badge">{lowStockCount}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Contenu principal */}
      <main className="main-content">
        {children}
      </main>

      {/* Navigation bas mobile */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`bottom-nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              {path === '/stock' && lowStockCount > 0 && (
                <span className="bottom-nav-badge">{lowStockCount}</span>
              )}
              <Icon size={22} strokeWidth={isActive(path) ? 2.2 : 1.6} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
