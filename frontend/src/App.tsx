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

  // Авто-обновление: при новом деплое бандл получает новый хэш в имени.
  // Периодически и при возврате в приложение проверяем /index.html и сравниваем
  // хэш <script src>. Если отличается — принудительно перезагружаем страницу,
  // чтобы пользователь подхватил свежий код без ручных действий.
  useEffect(() => {
    const runningBundle = Array.from(document.scripts)
      .map(s => s.getAttribute('src') || '')
      .find(src => /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(src))

    if (!runningBundle) return

    let reloading = false
    const checkForUpdate = async () => {
      if (reloading) return
      try {
        const res = await fetch('/?_=' + Date.now(), { cache: 'no-store' })
        const html = await res.text()
        const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
        if (m && !runningBundle.endsWith(m[0])) {
          reloading = true
          window.location.reload()
        }
      } catch { /* offline / network error — пропускаем */ }
    }

    const intervalId = setInterval(checkForUpdate, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') checkForUpdate() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(intervalId); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  useEffect(() => {
    const refresh = () => {
      if (!useStore.getState().token) return
      profileApi.get().then(({ data }) => {
        // Не перезаписывать профиль пустым/невалидным ответом (сбой прокси, пустое тело и т.д.)
        const d = data as { id?: number; telegram_id?: string } | null
        if (!d || (d.id == null && !d.telegram_id)) return
        const state = useStore.getState()
        const mergedUser = { ...state.user, ...data, photo_url: (data as { photo_url?: string | null }).photo_url ?? state.user?.photo_url ?? null }
        state.setUser(mergedUser)
        state.setProfile(data)
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
