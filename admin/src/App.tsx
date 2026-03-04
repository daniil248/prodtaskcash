import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TasksAdminPage from './pages/TasksAdminPage'
import UsersPage from './pages/UsersPage'
import WithdrawalsPage from './pages/WithdrawalsPage'
import BlacklistPage from './pages/BlacklistPage'
import SettingsPage from './pages/SettingsPage'
import './styles.css'

const NAV = [
  { path: '/dashboard', label: '📊 Дашборд' },
  { path: '/tasks', label: '✅ Задания' },
  { path: '/users', label: '👤 Пользователи' },
  { path: '/withdrawals', label: '💸 Выводы' },
  { path: '/blacklist', label: '🚫 Чёрный список' },
  { path: '/settings', label: '⚙️ Настройки' },
]

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const logout = () => {
    localStorage.removeItem('admin_token')
    window.location.reload()
  }

  const close = () => setSidebarOpen(false)

  return (
    <div className="layout">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={close}
      />

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span>TaskCash Admin</span>
          <button className="sidebar-close-btn" onClick={close} aria-label="Закрыть">✕</button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={close}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 10px', borderTop: '1px solid var(--border)' }}>
          <button className="nav-item" onClick={logout} style={{ color: '#FE5A5B' }}>
            🚪 Выйти
          </button>
        </div>
      </aside>

      <div className="content-wrapper">
        <header className="mobile-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Меню"
          >
            <span /><span /><span />
          </button>
          <span className="mobile-logo">Task<span>Cash</span> Admin</span>
        </header>

        <main className="main">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksAdminPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/withdrawals" element={<WithdrawalsPage />} />
            <Route path="/blacklist" element={<BlacklistPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'))

  useEffect(() => {
    // Fallback fullscreen call after React mounts (index.html handles the immediate call)
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; requestFullscreen?: () => void } } }).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.requestFullscreen?.()
    }
  }, [])

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />
  }

  return (
    <BrowserRouter>
      <AdminLayout />
    </BrowserRouter>
  )
}
