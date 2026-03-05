import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { profileApi } from './api/client'
import SplashPage from './pages/SplashPage'
import TasksPage from './pages/TasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import BonusesPage from './pages/BonusesPage'
import ProfilePage from './pages/ProfilePage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { token } = useStore()
  if (!token) return <Navigate to="/" replace />
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}

export default function App() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      const tgAny = tg as unknown as { requestFullscreen?: () => void }
      tgAny.requestFullscreen?.()
    }
  }, [])

  useEffect(() => {
    const refresh = () => {
      if (!useStore.getState().token) return
      profileApi.get().then(({ data }) => {
        useStore.getState().setUser(data)
        useStore.getState().setProfile(data)
      }).catch(() => {})
    }

    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.onEvent('activated', refresh)
      return () => tg.offEvent('activated', refresh)
    }

    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/tasks" element={<PrivateLayout><TasksPage /></PrivateLayout>} />
        <Route path="/tasks/:id" element={<PrivateLayout><TaskDetailPage /></PrivateLayout>} />
        <Route path="/bonuses" element={<PrivateLayout><BonusesPage /></PrivateLayout>} />
        <Route path="/profile" element={<PrivateLayout><ProfilePage /></PrivateLayout>} />
        <Route path="/profile/settings" element={<PrivateLayout><ProfileSettingsPage /></PrivateLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
