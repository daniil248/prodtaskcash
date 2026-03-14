import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, settingsApi } from '../api/client'
import { useStore } from '../store'
import { DOCUMENTS, getDocumentById } from '../documents'
import type { LegalDocument } from '../documents'
import DocumentView from '../components/DocumentView'

const TERMS_KEY = 'tc_terms_accepted'
const POLL_INTERVAL_MS = 150
const MAX_WAIT_MS = 6000
const FALLBACK_BOT_URL = 'https://t.me/test_zadaniya_bot'
const ICON_DISPLAY_MS = 800

// Градиент загрузки: зелёный → голубой (как на скрине), на весь экран с любого устройства
const loadingGradientBg = 'linear-gradient(90deg, #23C366 0%, #1AAB57 35%, #0FA3B0 70%, #13A8F5 100%)'

// Полный экран: градиент или нейтральный фон
const fullScreenContainer: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  minHeight: '100dvh',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#F5F5F5',
  padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
}

// Надпись TaskCash: на градиенте — белый + зелёный градиент; на светлом фоне — тёмный + зелёный. Тень на буквах.
const TaskCashLogo = ({ size = 'clamp(2.5rem, 12vw, 4rem)', variant = 'gradient' }: { size?: string; variant?: 'gradient' | 'light' }) => {
  const isLight = variant === 'light'
  const taskColor = isLight ? '#02020E' : '#FFFFFF'
  const shadow = isLight ? '0 2px 8px rgba(0,0,0,0.12)' : '0 4px 14px rgba(0,0,0,0.4)'
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', justifyContent: 'center', flexWrap: 'nowrap', filter: `drop-shadow(${shadow})` }}>
      <span style={{ fontSize: size, fontWeight: 800, color: taskColor, letterSpacing: '-0.02em', lineHeight: 1 }}>Task</span>
      <span style={{ fontSize: size, fontWeight: 800, background: isLight ? 'linear-gradient(135deg, #1AAB57 0%, #047935 100%)' : 'linear-gradient(135deg, #DFFD57 0%, #7CFE1E 50%, #047935 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em', lineHeight: 1 }}>Cash</span>
    </div>
  )
}

// Адаптивный контейнер для экранов приветствия и условий
const responsiveContainer: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100dvh',
  padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#F5F5F5',
}

export default function SplashPage() {
  const navigate = useNavigate()
  const { setAuth, token } = useStore()
  const [termsAccepted, setTermsAccepted] = useState(() => !!localStorage.getItem(TERMS_KEY))
  const [view, setView] = useState<'icon' | 'welcome' | 'terms' | 'loading' | 'not_in_telegram' | 'auth_error' | 'sdk_error'>(() =>
    localStorage.getItem(TERMS_KEY) ? 'loading' : 'icon'
  )
  const [botUrl, setBotUrl] = useState(FALLBACK_BOT_URL)
  const [acceptedChecks, setAcceptedChecks] = useState<[boolean, boolean, boolean]>(() => [true, true, true])
  const [openDocId, setOpenDocId] = useState<LegalDocument['id'] | null>(null)
  const doneRef = useRef(false)
  const sdkReadyCalledRef = useRef(false)
  const lastTgRef = useRef<TelegramWebApp | null>(null)

  useEffect(() => {
    if (termsAccepted) return
    if (view === 'icon') {
      const t = setTimeout(() => setView('welcome'), ICON_DISPLAY_MS)
      return () => clearTimeout(t)
    }
  }, [termsAccepted, view])

  const goToTerms = () => setView('terms')
  const acceptTerms = () => {
    localStorage.setItem(TERMS_KEY, '1')
    setTermsAccepted(true)
    setView('loading')
  }

  useEffect(() => {
    if (!termsAccepted) return
    const urlParams = new URLSearchParams(window.location.search)
    const urlReferralCode = urlParams.get('startapp') || urlParams.get('start_param') || null
    const REFKEY = 'tc_pending_ref'
    if (urlReferralCode) localStorage.setItem(REFKEY, urlReferralCode)
    const storedRef = localStorage.getItem(REFKEY)
    const getFingerprint = (): string => {
      const parts = [navigator.userAgent, window.screen.width + 'x' + window.screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language, String(navigator.hardwareConcurrency || '')]
      return btoa(parts.join('|')).slice(0, 64)
    }
    const applyTheme = (tg: TelegramWebApp) => {
      if (tg.colorScheme === 'dark') {
        document.documentElement.style.setProperty('--bg', '#1c1c1e')
        document.documentElement.style.setProperty('--text-primary', '#ffffff')
      }
    }
    const doAuth = async (initData: string, tg: TelegramWebApp | null) => {
      if (doneRef.current) return
      doneRef.current = true
      if (!initData && token) { navigate('/tasks', { replace: true }); return }
      const referralCode = tg?.initDataUnsafe?.start_param ?? urlReferralCode ?? storedRef ?? undefined
      try {
        const { data } = await authApi.telegram(initData, referralCode, getFingerprint())
        localStorage.removeItem(REFKEY)
        const photoUrl = data.user.photo_url || tg?.initDataUnsafe?.user?.photo_url || null
        setAuth(data.access_token, { ...data.user, photo_url: photoUrl })
        navigate('/tasks', { replace: true })
      } catch {
        if (token) { navigate('/tasks', { replace: true }); return }
        setView('auth_error')
      }
    }
    let elapsed = 0
    const poll = setInterval(() => {
      const tg = window.Telegram?.WebApp ?? null
      if (tg && !sdkReadyCalledRef.current) { sdkReadyCalledRef.current = true; tg.ready(); tg.expand(); applyTheme(tg); lastTgRef.current = tg }
      const initData = tg?.initData || ''
      if (initData) { clearInterval(poll); doAuth(initData, tg); return }
      elapsed += POLL_INTERVAL_MS
      if (elapsed >= MAX_WAIT_MS) {
        clearInterval(poll)
        if (window.Telegram?.WebApp) { token ? doAuth('', lastTgRef.current) : setView('sdk_error') }
        else {
          settingsApi.public().then(({ data: pub }) => { const name = (pub as { bot_username?: string })?.bot_username; if (name) setBotUrl(`https://t.me/${name}`) }).catch(() => {})
          setView('not_in_telegram')
        }
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [termsAccepted, navigate, token])

  const openInTelegram = () => { const tg = window.Telegram?.WebApp; if (tg) tg.openTelegramLink(botUrl); else window.open(botUrl, '_blank') }
  const retryAuth = () => { doneRef.current = false; sdkReadyCalledRef.current = false; setView('loading'); window.location.reload() }

  const btnBase: React.CSSProperties = { padding: '14px 28px', minHeight: 48, border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 'clamp(14px, 4vw, 16px)', cursor: 'pointer', width: '100%', maxWidth: 343 }
  const wrapStyle: React.CSSProperties = { ...responsiveContainer, background: 'linear-gradient(160deg, #23C366 0%, #047935 100%)', gap: 20, textAlign: 'center' }

  // ——— 1) Экран загрузки: градиент зелёный→голубой на весь экран, по центру надпись TaskCash (как на скрине 2) ———
  if (view === 'icon') {
    return (
      <div style={{ ...fullScreenContainer, background: loadingGradientBg }}>
        <TaskCashLogo size="clamp(2.8rem, 14vw, 5rem)" />
      </div>
    )
  }

  // ——— 2) Экран приветствия: лого с тенью, кликабельные «условия использования», под ними кнопка ———
  if (view === 'welcome') {
    return (
      <div style={{ ...responsiveContainer, justifyContent: 'space-between', paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 16 }}>
            <TaskCashLogo size="clamp(32px, 10vw, 48px)" variant="light" />
          </div>
          <p style={{ fontSize: 'clamp(18px, 4.5vw, 20px)', fontWeight: 600, color: '#02020E', marginBottom: 12 }}>Зарабатывайте</p>
          <div style={{ padding: '10px 24px', borderRadius: 21, background: 'linear-gradient(90deg, #23C366 0%, #1AAB57 100%)', marginBottom: 24 }}>
            <span style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 600, color: '#fff' }}>На простых заданиях</span>
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: 343, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 'clamp(12px, 2.8vw, 14px)', color: '#4D536D', lineHeight: 1.4, maxWidth: 320, textAlign: 'center', margin: 0 }}>
            Продолжая, вы соглашаетесь с{' '}
            <button type="button" onClick={goToTerms} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#23C366', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>условиями использования сервиса</button>.
          </p>
          <button type="button" onClick={goToTerms} style={{ ...btnBase, background: '#02020E', color: '#fff', border: '2px solid #23C366' }}>Принять и продолжить</button>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#8E8E93' }}>© 2026 TaskCash</span>
        </div>
      </div>
    )
  }

  // ——— 3) Экран условий: 3 документа с галочками (по умолчанию стоят) и ссылками; по клику — просмотр документа ———
  const goBack = () => setView('welcome')
  const toggleCheck = (index: 0 | 1 | 2) => {
    setAcceptedChecks((prev) => {
      const next = [...prev] as [boolean, boolean, boolean]
      next[index] = !next[index]
      return next
    })
  }
  const allAccepted = acceptedChecks.every(Boolean)
  const openDoc = openDocId ? getDocumentById(openDocId) : null

  if (view === 'terms') {
    return (
      <>
        <div style={{ ...responsiveContainer, background: '#fff', paddingTop: 0, paddingBottom: 'max(24px, env(safe-area-inset-bottom))', justifyContent: 'flex-start', alignItems: 'stretch', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
          <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', borderBottom: '1px solid #E5E5EA' }}>
            <button type="button" onClick={goBack} style={{ background: 'none', border: 'none', padding: '10px 12px', minWidth: 44, minHeight: 44, font: 'inherit', fontSize: 15, color: '#3A3A3C', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Назад</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', letterSpacing: '0.02em' }}>TASKCASH</span>
            <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93' }}>▾</span>
          </header>
          <h1 style={{ fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: 700, color: '#1C1C1E', margin: '16px 16px 8px', textAlign: 'center', flexShrink: 0 }}>УСЛОВИЯ ИСПОЛЬЗОВАНИЯ СЕРВИСА</h1>
          <p style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center', margin: '0 16px 16px', flexShrink: 0 }}>Ознакомьтесь с документами и отметьте согласие</p>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: 400, margin: '0 auto', padding: '0 16px 16px' }}>
            {DOCUMENTS.map((doc, index) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 48,
                  padding: '12px 0',
                  borderBottom: index < DOCUMENTS.length - 1 ? '1px solid #E5E5EA' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleCheck(index as 0 | 1 | 2)}
                  aria-checked={acceptedChecks[index]}
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    padding: 10,
                    margin: -10,
                    borderRadius: 6,
                    border: `2px solid ${acceptedChecks[index] ? '#23C366' : '#C7C7CC'}`,
                    background: acceptedChecks[index] ? '#23C366' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {acceptedChecks[index] && (
                    <svg width={14} height={10} viewBox="0 0 14 10" fill="none" style={{ pointerEvents: 'none' }}>
                      <path d="M1 5l4 4 8-8" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDocId(doc.id)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    padding: '10px 0',
                    minHeight: 44,
                    font: 'inherit',
                    fontSize: 'clamp(13px, 3.5vw, 15px)',
                    fontWeight: 600,
                    color: '#23C366',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {doc.title}
                </button>
              </div>
            ))}
          </div>
          <div style={{ flexShrink: 0, padding: '16px 16px max(16px, env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={acceptTerms}
              disabled={!allAccepted}
              style={{
                ...btnBase,
                background: allAccepted ? 'linear-gradient(90deg, #23C366 0%, #1AAB57 100%)' : '#C7C7CC',
                color: '#fff',
                boxShadow: allAccepted ? '0 4px 14px rgba(35,195,102,0.4)' : 'none',
                cursor: allAccepted ? 'pointer' : 'not-allowed',
              }}
            >
              Принять и продолжить
            </button>
          </div>
        </div>
        {openDoc && (
          <DocumentView document={openDoc} onClose={() => setOpenDocId(null)} backLabel="Назад" />
        )}
      </>
    )
  }

  // ——— 4) Загрузка: тот же градиент на весь экран, по центру TaskCash + спиннер ———
  if (view === 'loading') {
    return (
      <div style={{ ...fullScreenContainer, background: loadingGradientBg }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <TaskCashLogo size="clamp(2.8rem, 14vw, 5rem)" />
          <div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)', width: 36, height: 36 }} />
        </div>
      </div>
    )
  }

  // ——— Ошибки: градиент + лого + текст + кнопки ———
  if (view === 'not_in_telegram') {
    return (
      <div style={wrapStyle}>
        <TaskCashLogo size="clamp(1.8rem, 8vw, 2.5rem)" />
        <p style={{ marginTop: 8, color: '#fff', opacity: 0.9, fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.5, textAlign: 'center' }}>Откройте приложение через Telegram-бот</p>
        <button type="button" onClick={openInTelegram} style={{ ...btnBase, background: '#fff', color: '#047935' }}>Открыть в Telegram</button>
      </div>
    )
  }
  if (view === 'auth_error') {
    return (
      <div style={wrapStyle}>
        <TaskCashLogo size="clamp(1.8rem, 8vw, 2.5rem)" />
        <p style={{ marginTop: 8, color: '#fff', opacity: 0.9, fontSize: 'clamp(13px, 3.5vw, 15px)', textAlign: 'center' }}>Ошибка подключения. Проверьте интернет.</p>
        <button type="button" onClick={retryAuth} style={{ ...btnBase, background: '#fff', color: '#047935' }}>Повторить</button>
      </div>
    )
  }
  if (view === 'sdk_error') {
    return (
      <div style={wrapStyle}>
        <TaskCashLogo size="clamp(1.8rem, 8vw, 2.5rem)" />
        <p style={{ marginTop: 8, color: '#fff', opacity: 0.9, fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.5, textAlign: 'center' }}>Ваша версия Telegram не передаёт данные. Откройте приложение через бот.</p>
        <button type="button" onClick={openInTelegram} style={{ ...btnBase, background: '#fff', color: '#047935' }}>Открыть через бот</button>
        <button type="button" onClick={retryAuth} style={{ ...btnBase, background: 'rgba(255,255,255,0.2)', color: '#fff', marginTop: 8 }}>Попробовать снова</button>
      </div>
    )
  }

  return (
    <div style={{ ...fullScreenContainer, background: loadingGradientBg }}>
      <TaskCashLogo size="clamp(2.8rem, 14vw, 5rem)" />
    </div>
  )
}
