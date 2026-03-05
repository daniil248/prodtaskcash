import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useStore } from '../store'

export default function SplashPage() {
  const navigate = useNavigate()
  const { setAuth, token } = useStore()
  const [error, setError] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }

    const getFingerprint = (): string => {
      const parts = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.language,
        String(navigator.hardwareConcurrency || ''),
      ]
      return btoa(parts.join('|')).slice(0, 64)
    }

    const applyTelegramTheme = () => {
      if (!tg) return
      const scheme = tg?.colorScheme
      if (scheme === 'dark') {
        document.documentElement.style.setProperty('--bg', '#1c1c1e')
        document.documentElement.style.setProperty('--bg-card', '#2c2c2e')
        document.documentElement.style.setProperty('--bg-secondary', '#3a3a3c')
        document.documentElement.style.setProperty('--border', '#3a3a3c')
        document.documentElement.style.setProperty('--text-primary', '#ffffff')
        document.documentElement.style.setProperty('--text-secondary', '#ebebf5cc')
        document.documentElement.style.setProperty('--text-muted', '#ebebf599')
      }
    }

    applyTelegramTheme()

    const initData = tg?.initData || ''

    // Not in Telegram — show open-in-bot message
    if (!initData) {
      setError(true)
      return
    }

    const init = async () => {
      try {
        const referralCode = tg?.initDataUnsafe?.start_param
        const fingerprint = getFingerprint()
        const { data } = await authApi.telegram(initData, referralCode, fingerprint)
        const photoUrl = data.user.photo_url || tg?.initDataUnsafe?.user?.photo_url || null
        setAuth(data.access_token, { ...data.user, photo_url: photoUrl })
        navigate('/tasks', { replace: true })
      } catch {
        // If token already exists, don't block — just navigate
        if (token) navigate('/tasks', { replace: true })
        else setError(true)
      }
    }

    // Always call auth to refresh user data (total_earned, balance, etc.)
    // If token exists — navigate immediately and refresh in background
    if (token) {
      navigate('/tasks', { replace: true })
      init().catch(() => {})
    } else {
      init()
    }
  }, [])

  const logoBlock = (
    <div style={{
      width: 100,
      height: 100,
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(10px)',
    }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <path d="M14 28L24 38L42 20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )

  if (error) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #23C366 0%, #047935 100%)',
        gap: 20,
        padding: '0 32px',
        textAlign: 'center',
      }}>
        {logoBlock}
        <div style={{ color: '#fff' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>TaskCash</h1>
          <p style={{ marginTop: 8, opacity: 0.85, fontSize: 15, lineHeight: 1.5 }}>
            Откройте приложение через Telegram-бот
          </p>
        </div>
        <a
          href="https://t.me/test_zadaniya_bot"
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '14px 28px',
            background: '#fff',
            color: '#047935',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
          }}
        >
          🚀 Открыть в Telegram
        </a>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #23C366 0%, #047935 100%)',
      gap: 24,
    }}>
      {logoBlock}

      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px' }}>TaskCash</h1>
        <p style={{ marginTop: 8, opacity: 0.8, fontSize: 16 }}>Выполняй задания — получай деньги</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
      </div>
    </div>
  )
}
