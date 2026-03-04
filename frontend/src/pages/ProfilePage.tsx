import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi, withdrawalsApi, bonusesApi } from '../api/client'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import type { Transaction, TransactionType, Bonuses } from '../types'

// ── exact SVG colors ──────────────────────────────────────────────
const C = {
  bg: '#F5F5F5',
  name: '#2B2A2E',
  sub: '#9292A1',
  label: '#4D536D',
  border: '#EEECF9',
  accent: '#23C366',
  gradStart: '#35DE66',
  gradMid: '#2CE1A1',
  gradEnd: '#02BBC7',
  white: '#ffffff',
  badgeFill: '#F8F8FA',
}
const GRAD = `linear-gradient(135deg, ${C.gradStart} 0%, ${C.gradMid} 55%, ${C.gradEnd} 100%)`


const METHODS = [
  { id: 'card', label: '💳 На карту', placeholder: '0000 0000 0000 0000', hint: 'Номер банковской карты (16 цифр)' },
  { id: 'sbp', label: '📱 Через СБП', placeholder: '+7 (___) ___-__-__', hint: 'Номер телефона привязанного к СБП' },
]

const PAGE_SIZE = 20
const LEVEL_THRESHOLDS = [0, 500, 2000, 5000, 10000, 99999]

function calcLevel(earned: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (earned >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

function levelProgress(earned: number) {
  const lvl = calcLevel(earned)
  const from = LEVEL_THRESHOLDS[lvl - 1] ?? 0
  const to = LEVEL_THRESHOLDS[lvl] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  if (to === from) return 100
  return Math.min(100, ((earned - from) / (to - from)) * 100)
}

// ── LVL Badge — EXACT paths from profile.svg (star hexagon + inner gear icon + corner triangles) ──
function LevelBadge({ level }: { level: number }) {
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      {/* viewBox taken directly from profile.svg clipPath: translate(136,365) size 48×48 */}
      <svg width="48" height="48" viewBox="136 365 48 48" fill="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {/* Exact gradient from profile.svg paint0_linear_0_1 */}
          <linearGradient id="pgBadge" x1="136" y1="479.667" x2="200.349" y2="473.666" gradientUnits="userSpaceOnUse">
            <stop offset="0.434477" stopColor="#35DE66"/>
            <stop offset="0.581125" stopColor="#2CE1A1"/>
            <stop offset="1" stopColor="#02BBC7"/>
          </linearGradient>
        </defs>

        {/* EXACT hexagonal star outline — profile.svg line 11 */}
        <path
          d="M158.708 367.76C159.504 367.287 160.496 367.288 161.292 367.761L169.445 372.6L169.463 372.61L169.48 372.62L177.748 377.262C178.556 377.715 179.051 378.573 179.04 379.499L178.926 388.979V389.021L179.04 398.501C179.051 399.427 178.556 400.285 177.748 400.738L169.48 405.38L169.463 405.39L169.445 405.4L161.292 410.239V410.24C160.496 410.713 159.504 410.713 158.708 410.24V410.239L150.555 405.4L150.537 405.39L150.52 405.38L142.252 400.738C141.444 400.285 140.949 399.427 140.96 398.501L141.074 389.021V388.979L140.96 379.499C140.949 378.573 141.444 377.715 142.252 377.262L150.52 372.62L150.537 372.61L150.555 372.6L158.708 367.76Z"
          fill="#F8F8FA"
          stroke="url(#pgBadge)"
          strokeWidth="3.42857"
        />

        {/* EXACT inner badge icon (gear/star) — profile.svg lines 14–15 */}
        <path
          fillRule="evenodd" clipRule="evenodd"
          d="M160 373.286C160.385 373.268 160.748 373.345 161.09 373.519C161.521 373.933 161.936 374.366 162.335 374.817C162.672 375.025 163.035 375.094 163.425 375.024C163.809 374.914 164.19 374.793 164.567 374.661C165.411 374.446 166.042 374.714 166.461 375.465C166.585 375.928 166.689 376.395 166.773 376.867C166.889 377.26 167.122 377.562 167.473 377.775C168.019 377.94 168.573 378.078 169.134 378.19C169.944 378.573 170.247 379.205 170.042 380.084C169.921 380.448 169.8 380.811 169.679 381.174C169.59 381.628 169.676 382.043 169.938 382.42C170.319 382.766 170.7 383.112 171.08 383.458C171.485 384.041 171.52 384.647 171.184 385.274C170.754 385.689 170.321 386.104 169.886 386.52C169.678 386.856 169.609 387.219 169.679 387.609C169.807 388.045 169.945 388.478 170.094 388.907C170.215 389.694 169.93 390.274 169.238 390.645C168.775 390.769 168.308 390.873 167.837 390.957C167.406 391.093 167.086 391.361 166.876 391.761C166.749 392.278 166.628 392.797 166.513 393.318C166.13 394.128 165.499 394.431 164.619 394.226C164.256 394.105 163.892 393.984 163.529 393.863C163.075 393.774 162.66 393.86 162.284 394.123C161.938 394.503 161.592 394.884 161.246 395.264C160.661 395.664 160.056 395.698 159.429 395.368C158.998 394.954 158.583 394.522 158.184 394.071C157.847 393.862 157.484 393.793 157.094 393.863C156.658 393.991 156.226 394.129 155.796 394.278C155.009 394.399 154.43 394.114 154.058 393.422C153.934 392.96 153.83 392.493 153.746 392.021C153.61 391.59 153.342 391.27 152.942 391.061C152.425 390.933 151.906 390.812 151.385 390.697C150.575 390.314 150.272 389.683 150.477 388.803C150.598 388.44 150.719 388.077 150.84 387.713C150.929 387.259 150.843 386.844 150.581 386.468C150.2 386.122 149.82 385.776 149.439 385.43C149.034 384.846 148.999 384.241 149.335 383.613C149.763 383.199 150.196 382.784 150.633 382.368C150.841 382.031 150.91 381.668 150.84 381.278C150.712 380.842 150.574 380.41 150.425 379.981C150.304 379.193 150.589 378.614 151.281 378.242C151.744 378.118 152.211 378.015 152.683 377.931C153.113 377.794 153.433 377.526 153.643 377.126C153.77 376.609 153.891 376.09 154.006 375.569C154.389 374.759 155.02 374.457 155.9 374.661C156.263 374.782 156.627 374.903 156.99 375.024C157.444 375.113 157.859 375.027 158.236 374.765C158.582 374.384 158.927 374.004 159.273 373.623C159.501 373.466 159.743 373.354 160 373.286ZM159.533 377.905C162.318 377.753 164.454 378.843 165.942 381.174C167.084 383.354 167.084 385.534 165.942 387.713C164.215 390.371 161.784 391.4 158.651 390.801C155.853 389.938 154.219 388.061 153.746 385.17C153.57 382.384 154.651 380.248 156.99 378.761C157.79 378.313 158.638 378.027 159.533 377.905Z"
          fill="url(#pgBadge)"
        />

        {/* EXACT corner triangle left — profile.svg line 15 */}
        <path
          fillRule="evenodd" clipRule="evenodd"
          d="M146.974 396.276C146.974 396.121 146.974 395.965 146.974 395.809C148.391 394.349 149.836 392.913 151.307 391.502C151.678 391.586 152.05 391.664 152.423 391.735C152.589 391.779 152.736 391.857 152.864 391.969C153.024 392.46 153.145 392.962 153.227 393.474C153.478 394.165 153.936 394.667 154.603 394.979C153.245 396.362 151.879 397.737 150.503 399.105C150.227 399.293 149.977 399.267 149.75 399.027C149.709 398.308 149.718 397.59 149.776 396.873C149.766 396.704 149.697 396.565 149.569 396.458C148.756 396.441 147.943 396.423 147.13 396.406C147.084 396.352 147.032 396.309 146.974 396.276Z"
          fill="url(#pgBadge)"
        />

        {/* EXACT corner triangle right — profile.svg line 16 */}
        <path
          fillRule="evenodd" clipRule="evenodd"
          d="M173.545 395.809C173.545 395.965 173.545 396.121 173.545 396.276C173.487 396.309 173.435 396.352 173.39 396.406C172.576 396.423 171.763 396.441 170.95 396.458C170.817 396.573 170.748 396.72 170.743 396.899C170.8 397.59 170.809 398.282 170.769 398.975C170.567 399.261 170.316 399.304 170.016 399.105C168.64 397.737 167.274 396.362 165.916 394.979C166.643 394.641 167.119 394.088 167.344 393.318C167.412 392.836 167.533 392.369 167.707 391.917C167.8 391.823 167.913 391.762 168.044 391.735C168.458 391.639 168.873 391.569 169.29 391.528C170.72 392.949 172.139 394.377 173.545 395.809Z"
          fill="url(#pgBadge)"
        />
      </svg>

      {/* Level number + LVL label overlaid in center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#23C366', lineHeight: 1 }}>{level}</span>
        <span style={{ fontSize: 7, fontWeight: 700, color: '#4D536D', letterSpacing: 0.5, marginTop: 1 }}>LVL</span>
      </div>
    </div>
  )
}

// ── Settings gear icon — EXACT path from ic:round-settings in profile.svg (lines 30–31) ──
function GearIcon() {
  return (
    // viewBox covers the 40×40 button area at x=439,y=365 from profile.svg
    <svg width="22" height="22" viewBox="439 365 40 40" fill="none">
      <path
        d="M466.5 385C466.5 384.77 466.49 384.55 466.47 384.32L468.33 382.91C468.73 382.61 468.84 382.05 468.59 381.61L466.72 378.38C466.6 378.168 466.406 378.008 466.175 377.931C465.945 377.853 465.694 377.864 465.47 377.96L463.32 378.87C462.95 378.61 462.56 378.38 462.15 378.19L461.86 375.88C461.8 375.38 461.37 375 460.87 375H457.14C456.63 375 456.2 375.38 456.14 375.88L455.85 378.19C455.44 378.38 455.05 378.61 454.68 378.87L452.53 377.96C452.07 377.76 451.53 377.94 451.28 378.38L449.41 381.62C449.16 382.06 449.27 382.61 449.67 382.92L451.53 384.33C451.488 384.779 451.488 385.231 451.53 385.68L449.67 387.09C449.27 387.39 449.16 387.95 449.41 388.39L451.28 391.62C451.53 392.06 452.07 392.24 452.53 392.04L454.68 391.13C455.05 391.39 455.44 391.62 455.85 391.81L456.14 394.12C456.2 394.62 456.63 395 457.13 395H460.86C461.36 395 461.79 394.62 461.85 394.12L462.14 391.81C462.55 391.62 462.94 391.39 463.31 391.13L465.46 392.04C465.92 392.24 466.46 392.06 466.71 391.62L468.58 388.39C468.83 387.95 468.72 387.4 468.32 387.09L466.46 385.68C466.49 385.45 466.5 385.23 466.5 385ZM459.04 388.5C457.11 388.5 455.54 386.93 455.54 385C455.54 383.07 457.11 381.5 459.04 381.5C460.97 381.5 462.54 383.07 462.54 385C462.54 386.93 460.97 388.5 459.04 388.5Z"
        fill="#4D536D"
      />
    </svg>
  )
}

// ── Avatar (photo or initial); photo_url from store or Telegram initDataUnsafe for mobile ──
function Avatar({ photoUrl, firstName, size = 68 }: { photoUrl?: string | null; firstName: string; size?: number }) {
  const [imgErr, setImgErr] = useState(false)
  if (photoUrl && !imgErr) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        onError={() => setImgErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: `3px solid ${C.white}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          backgroundColor: C.bg,
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: GRAD,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        color: C.white,
        flexShrink: 0,
        border: `3px solid ${C.white}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      }}
    >
      {(firstName || 'U')[0].toUpperCase()}
    </div>
  )
}

// ── History icon — EXACT path from material-symbols:history-rounded in profile.svg (line 83) ──
function HistoryIcon() {
  return (
    // viewBox covers icon at x=136..158, y=817..835 from profile.svg
    <svg width="20" height="20" viewBox="136 815 22 22" fill="none">
      <path
        d="M148 835C145.9 835 144.042 834.363 142.425 833.088C140.808 831.813 139.758 830.184 139.275 828.2C139.208 827.95 139.258 827.721 139.425 827.513C139.592 827.305 139.817 827.184 140.1 827.15C140.367 827.117 140.608 827.167 140.825 827.3C141.042 827.433 141.192 827.633 141.275 827.9C141.675 829.4 142.5 830.625 143.75 831.575C145 832.525 146.417 833 148 833C149.95 833 151.604 832.321 152.963 830.963C154.322 829.605 155.001 827.951 155 826C154.999 824.049 154.32 822.395 152.963 821.038C151.606 819.681 149.951 819.001 148 819C146.85 819 145.775 819.267 144.775 819.8C143.775 820.333 142.933 821.067 142.25 822H144C144.283 822 144.521 822.096 144.713 822.288C144.905 822.48 145.001 822.717 145 823C144.999 823.283 144.903 823.52 144.712 823.713C144.521 823.906 144.283 824.001 144 824H140C139.717 824 139.479 823.904 139.288 823.712C139.097 823.52 139.001 823.283 139 823V819C139 818.717 139.096 818.479 139.288 818.288C139.48 818.097 139.717 818.001 140 818C140.283 817.999 140.52 818.095 140.713 818.288C140.906 818.481 141.001 818.718 141 819V820.35C141.85 819.283 142.888 818.458 144.113 817.875C145.338 817.292 146.634 817 148 817C149.25 817 150.421 817.238 151.513 817.713C152.605 818.188 153.555 818.83 154.363 819.637C155.171 820.444 155.813 821.394 156.288 822.487C156.763 823.58 157.001 824.751 157 826C156.999 827.249 156.762 828.42 156.288 829.513C155.814 830.606 155.172 831.556 154.363 832.363C153.554 833.17 152.604 833.812 151.513 834.288C150.422 834.764 149.251 835.001 148 835ZM149 825.6L151.5 828.1C151.683 828.283 151.775 828.517 151.775 828.8C151.775 829.083 151.683 829.317 151.5 829.5C151.317 829.683 151.083 829.775 150.8 829.775C150.517 829.775 150.283 829.683 150.1 829.5L147.3 826.7C147.2 826.6 147.125 826.488 147.075 826.363C147.025 826.238 147 826.109 147 825.975V822C147 821.717 147.096 821.479 147.288 821.288C147.48 821.097 147.717 821.001 148 821C148.283 820.999 148.52 821.095 148.713 821.288C148.906 821.481 149.001 821.718 149 822V825.6Z"
        fill="#23C366"
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { profile, setProfile, user } = useStore()
  const [bonuses, setBonuses] = useState<Bonuses | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [txPage, setTxPage] = useState(1)
  const [txPages, setTxPages] = useState(1)
  const [txLoadingMore, setTxLoadingMore] = useState(false)
  const [loading, setLoading] = useState(!profile)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [wAmount, setWAmount] = useState('')
  const [wMethod, setWMethod] = useState('card')
  const [wRequisites, setWRequisites] = useState('')
  const [wLoading, setWLoading] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const navigate = useNavigate()
  const loadTransactions = useCallback(async (p: number, typeFilter: TransactionType | '', append = false) => {
    if (!append) setLoading(true)
    else setTxLoadingMore(true)
    try {
      const { data } = await profileApi.transactions({ page: p, page_size: PAGE_SIZE, tx_type: typeFilter || undefined })
      setTransactions((prev) => append ? [...prev, ...data.items] : data.items)

      setTxPage(data.page)
      setTxPages(data.pages)
    } finally {
      setLoading(false)
      setTxLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      profileApi.get(),
      bonusesApi.get(),
      profileApi.transactions({ page: 1, page_size: 1, tx_type: 'task_reward' }),
    ]).then(([p, b, ct]) => {
      setProfile(p.data)
      setBonuses(b.data)
      setCompletedCount(ct.data.total)
    })
    loadTransactions(1, '')
  }, [])

  const handleWithdraw = async () => {
    const amount = parseFloat(wAmount)
    if (!amount || amount <= 0) return showToast('Введите сумму', 'error')
    if (!wRequisites.trim()) return showToast('Введите реквизиты', 'error')
    setWLoading(true)
    try {
      await withdrawalsApi.create({ amount, method: wMethod, requisites: wRequisites })
      const updated = await profileApi.get()
      setProfile(updated.data)
      setShowWithdrawForm(false)
      setWAmount('')
      setWRequisites('')
      showToast('Заявка на вывод создана', 'success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ошибка'
      showToast(msg, 'error')
    } finally {
      setWLoading(false)
    }
  }

  if (loading && !profile) return <div className="loader"><div className="spinner" /></div>

  const p = profile
  const totalEarned = parseFloat(p?.total_earned || '0')
  const balance = parseFloat(p?.balance || '0')
  const balancePending = parseFloat(p?.balance_pending || '0')
  const level = calcLevel(totalEarned)
  const progress = levelProgress(totalEarned)
  const nextLevelAt = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь'
  const refsCount = bonuses?.referrals_count ?? 0
  const activeMethod = METHODS.find((m) => m.id === wMethod)!

  return (
    <div className="page" style={{ background: C.bg }}>
      <div className="scroll-area">

        {/* ── USER INFO (on #F5F5F5, no green bg — exact SVG) ─────────── */}
        <div style={{
          background: C.bg,
          padding: '20px 16px 0',
          paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        }}>

          {/* Row: LVL badge | Avatar | Settings */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <LevelBadge level={level} />

            <Avatar
              photoUrl={
                user?.photo_url ??
                (typeof window !== 'undefined' && (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { photo_url?: string } } } } }).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ??
                null
              }
              firstName={user?.first_name || 'U'}
              size={72}
            />

            {/* Settings: open full profile_settings page (min 48px touch target for mobile) */}
            <button
              type="button"
              onClick={() => navigate('/profile/settings')}
              style={{
                width: 48,
                height: 48,
                minWidth: 48,
                minHeight: 48,
                borderRadius: '50%',
                background: C.white,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(77,83,109,0.18)',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10,
              }}
              aria-label="Настройки"
            >
              <GearIcon />
            </button>
          </div>

          {/* Name + @username + ID — dark text on #F5F5F5 (exact SVG colors) */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.name, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              {displayName}
            </p>
            {user?.username && (
              <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>@{user.username}</p>
            )}
            <p style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>ID: {user?.telegram_id}</p>
          </div>

          {/* Progress bar — #EEECF9 track + gradient fill */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              height: 8, borderRadius: 4,
              background: C.border, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: GRAD,
                width: `${progress}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Level labels — #4D536D text */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: C.label }}>Уровень {level}</span>
            <span style={{ fontSize: 11, color: C.sub }}>
              {totalEarned.toFixed(0)}₽ / {nextLevelAt}₽
            </span>
            <span style={{ fontSize: 11, color: C.label }}>Уровень {level + 1}</span>
          </div>
        </div>

        {/* ── BALANCE CARD — gradient fill (exact SVG paint4_linear: #35DE66→#02BBC7) ── */}
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: GRAD,
            borderRadius: 16,
            padding: '16px 16px 14px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(35,195,102,0.30)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {/* White label text (small) */}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                  Доступно
                </p>
                {/* Big white balance amount */}
                <p style={{ fontSize: 36, fontWeight: 800, color: C.white, letterSpacing: '-1.5px', lineHeight: 1 }}>
                  {balance.toFixed(2)}₽
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
                  Всего: {totalEarned.toFixed(2)}₽
                </p>
                {balancePending > 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    ⏳ {balancePending.toFixed(2)}₽ ожидает
                  </p>
                )}
              </div>

              {/* Circle icon — #F5F5F5 bg (exact SVG: rect x=409,y=569, w=54,h=54, rx=27, fill=#F5F5F5) */}
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, flexShrink: 0,
              }}>
                💰
              </div>
            </div>

            {/* Small white button with green text — centered (exact SVG: x=225.5,y=623, w=164,h=44, rx=22, fill=white, text=#23C366) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <button
                onClick={() => setShowWithdrawForm(true)}
                style={{
                  width: 164, height: 44, borderRadius: 22,
                  border: 'none', cursor: 'pointer',
                  background: C.white,
                  color: C.accent,
                  fontWeight: 700, fontSize: 14,
                }}
              >
                Вывести деньги
              </button>
            </div>
          </div>
        </div>


        {/* ── STATS CARD: Выполнено заданий | Рефералов — exact SVG layout ── */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            background: C.white, borderRadius: 12, padding: '16px 0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex' }}>
              {/* Left: completed tasks count */}
              <div style={{ flex: 1, padding: '4px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 38, fontWeight: 800, color: C.label, lineHeight: 1 }}>
                  {completedCount}
                </p>
                <p style={{ fontSize: 12, color: C.sub, marginTop: 6, fontWeight: 500 }}>Выполнено заданий</p>
              </div>

              {/* SVG divider: stroke=#EEECF9 */}
              <div style={{ width: 1, background: C.border, alignSelf: 'stretch', margin: '4px 0' }} />

              {/* Right: referrals count */}
              <div style={{ flex: 1, padding: '4px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 38, fontWeight: 800, color: C.label, lineHeight: 1 }}>
                  {refsCount}
                </p>
                <p style={{ fontSize: 12, color: C.sub, marginTop: 6, fontWeight: 500 }}>Рефералов</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ИСТОРИЯ ВЫПЛАТ — header from SVG: history icon + label uppercase ── */}
        <div style={{ padding: '20px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HistoryIcon />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 0.3 }}>
            ИСТОРИЯ ВЫПЛАТ
          </span>
        </div>

        {/* ── TRANSACTION LIST ── */}
        <div style={{ padding: '10px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            /* Empty state exactly from SVG: "У вас пока нет выплат" + subtitle + green button */
            <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.label, marginBottom: 6 }}>
                У вас пока нет выплат
              </p>
              <p style={{ fontSize: 13, color: C.accent, marginBottom: 20 }}>
                Выполняйте задания и зарабатывайте!
              </p>
              <button
                onClick={() => navigate('/tasks')}
                style={{
                  height: 46, borderRadius: 23, border: 'none',
                  background: GRAD, color: C.white,
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  padding: '0 28px',
                }}
              >
                Просмотреть активные задачи
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: C.white, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                {transactions.map((tx, i) => (
                  <div key={tx.id}>
                    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: C.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <HistoryIcon />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.name }}>{tx.description}</p>
                          <p style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                            {new Date(tx.created_at).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontWeight: 700, fontSize: 14,
                        color: parseFloat(tx.amount) >= 0 ? C.accent : '#EF4444',
                        whiteSpace: 'nowrap',
                      }}>
                        {parseFloat(tx.amount) >= 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(2)}₽
                      </span>
                    </div>
                    {i < transactions.length - 1 && (
                      <div style={{ height: 1, background: C.border, margin: '0 16px' }} />
                    )}
                  </div>
                ))}
              </div>
              {txPage < txPages && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <button onClick={() => loadTransactions(txPage + 1, '', true)} disabled={txLoadingMore} style={{
                    padding: '8px 24px', borderRadius: 100,
                    border: `1.5px solid ${C.accent}`, background: 'none', color: C.accent,
                    fontWeight: 600, fontSize: 13, cursor: txLoadingMore ? 'default' : 'pointer',
                    opacity: txLoadingMore ? 0.6 : 1,
                  }}>
                    {txLoadingMore ? 'Загрузка...' : 'Ещё'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ height: 32 }} />
      </div>

      {/* ── WITHDRAW MODAL — full overlay from SVG "withdraw" screen ─────── */}
      {showWithdrawForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowWithdrawForm(false)}>
          <div style={{
            width: '100%', background: C.white,
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 36px',
            maxHeight: '90vh', overflowY: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: C.name }}>Вывод денег</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 2 }}>
                  {balance.toFixed(0)} ₽
                </p>
              </div>
              <button onClick={() => setShowWithdrawForm(false)} style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: C.bg,
                fontSize: 18, cursor: 'pointer', color: C.label,
              }}>×</button>
            </div>
            {/* Method select */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {METHODS.map((m) => (
                <button key={m.id} onClick={() => { setWMethod(m.id); setWRequisites('') }} style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12,
                  border: `2px solid ${wMethod === m.id ? C.accent : C.border}`,
                  background: wMethod === m.id ? 'rgba(35,195,102,0.08)' : C.bg,
                  fontWeight: 600, fontSize: 14,
                  color: wMethod === m.id ? C.accent : C.label, cursor: 'pointer',
                }}>{m.label}</button>
              ))}
            </div>
            {/* Amount */}
            <input type="number" placeholder="Сумма (₽)" value={wAmount} onChange={(e) => setWAmount(e.target.value)} style={{
              width: '100%', padding: '13px 14px', borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 16,
              marginBottom: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              background: C.white, color: C.name,
            }} />
            {/* Requisites */}
            <input type="text" placeholder={activeMethod.placeholder} value={wRequisites} onChange={(e) => setWRequisites(e.target.value)} style={{
              width: '100%', padding: '13px 14px', borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 14,
              marginBottom: 6, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              background: C.white, color: C.name,
            }} />
            <p style={{ marginBottom: 8, fontSize: 11, color: C.sub }}>{activeMethod.hint}</p>
            {/* Info rows — from SVG withdraw screen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#23C366" strokeWidth="1.5"/>
                  <path d="M8 4.5V8.5M8 10.5V11.5" stroke="#23C366" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 12, color: C.sub }}>Выплата: Доступно 24/7</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#23C366" strokeWidth="1.5"/>
                  <path d="M5 8l2 2 4-4" stroke="#23C366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 12, color: C.sub }}>Автоматически. Без оператора</span>
              </div>
            </div>
            <p style={{ marginBottom: 14, fontSize: 12, color: C.sub }}>Комиссия: 5% · Мин. 500₽</p>
            <button onClick={handleWithdraw} disabled={wLoading} style={{
              width: '100%', height: 50, borderRadius: 25, border: 'none',
              background: GRAD, color: C.white, fontWeight: 700, fontSize: 16,
              cursor: wLoading ? 'default' : 'pointer',
              opacity: wLoading ? 0.6 : 1,
            }}>
              {wLoading ? '...' : 'Подтвердить вывод'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
