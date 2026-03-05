import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bonusesApi, tasksApi } from '../api/client'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import { calcLevel } from '../utils/level'
import LevelBadge from '../components/LevelBadge'
import type { Referral, Task, ReferralIncomeDay } from '../types'

// ── Brand constants ────────────────────────────────────────────────────────────
const GRAD   = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)'
const ACCENT = '#23C366'

// ── Speaker / megaphone illustration — exact paths from bonuses.svg Vector_7..13
function SpeakerIllustration() {
  return (
    <svg width="56" height="56" viewBox="597 358 42 43" fill="none" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="spkGrad" x1="597.571" y1="422.037" x2="627.113" y2="419.176" gradientUnits="userSpaceOnUse">
          <stop offset="0.434477" stopColor="#35DE66"/>
          <stop offset="0.581125" stopColor="#2CE1A1"/>
          <stop offset="1" stopColor="#02BBC7"/>
        </linearGradient>
      </defs>
      <path d="M626.947 370.785C630.838 376.878 633.196 383.479 631.568 384.519C629.94 385.558 624.942 380.644 621.051 374.551C617.16 368.458 614.802 361.857 616.43 360.817C618.058 359.777 623.055 364.692 626.947 370.785Z" fill="#727272"/>
      <path d="M631.497 384.564C630.074 385.472 625.244 380.45 621.353 374.357C617.462 368.264 614.937 361.77 616.359 360.862C616.441 360.81 616.533 360.775 616.633 360.756C615.962 360.741 615.305 361.091 614.916 361.835C613.202 365.112 608.828 372.385 608.828 372.385C608.828 372.385 606.658 371.059 605.891 370.598L622.124 363.028L622.058 363.139C622.892 362.596 624.037 362.545 625.115 363.204C627.694 364.783 630.241 368.846 631.568 372.951C632.698 376.418 632.543 379.862 631.497 384.564Z" fill="#9B9FB0"/>
      <path d="M625.115 379.24C626.463 378.378 626.077 375.363 624.252 372.505C622.426 369.647 619.853 368.029 618.505 368.89C617.156 369.752 617.542 372.767 619.368 375.625C621.193 378.483 623.766 380.101 625.115 379.24Z" fill="#FFE227"/>
      <path d="M606.612 392.325L619.622 385.242L610.728 371.316L598.968 380.054C598.892 380.102 595.713 383.01 599.204 388.476C602.695 393.942 606.612 392.325 606.612 392.325Z" fill="url(#spkGrad)"/>
      <path d="M614.842 398.299L613.499 399.084C612.407 399.723 611.005 399.355 610.367 398.264L606.807 392.176C606.169 391.085 606.536 389.682 607.627 389.044L608.97 388.259C610.062 387.621 611.464 387.988 612.102 389.079L615.662 395.167C616.301 396.259 615.933 397.661 614.842 398.299Z" fill="#444444"/>
      <path d="M629.402 367.741L635.71 361.494C635.977 361.229 636.42 361.273 636.631 361.585L638.086 363.739C638.287 364.036 638.185 364.441 637.869 364.608L630.106 368.701C629.975 368.77 629.823 368.788 629.679 368.752C629.536 368.716 629.41 368.628 629.327 368.505C629.249 368.389 629.213 368.254 629.226 368.119C629.238 367.985 629.297 367.858 629.402 367.741Z" fill="#727272"/>
      <path d="M600.943 383.881C600.744 383.882 600.548 383.832 600.373 383.736C600.199 383.641 600.052 383.503 599.945 383.335C599.593 382.784 599.754 382.053 600.305 381.702L605.168 378.595C605.719 378.244 606.45 378.405 606.802 378.955C607.154 379.506 606.992 380.237 606.442 380.589L601.578 383.695C601.388 383.817 601.168 383.881 600.943 383.881Z" fill="white"/>
    </svg>
  )
}

// ── Copy icon — tabler:copy from bonuses.svg Vector_14+15 ─────────────────────
function CopyIconSvg() {
  return (
    <svg width="20" height="20" viewBox="875 689 22 22" fill="none">
      <path d="M881 697.667C881 696.96 881.281 696.281 881.781 695.781C882.281 695.281 882.96 695 883.667 695H892.333C892.683 695 893.03 695.069 893.354 695.203C893.677 695.337 893.971 695.533 894.219 695.781C894.467 696.029 894.663 696.323 894.797 696.646C894.931 696.97 895 697.317 895 697.667V706.333C895 706.683 894.931 707.03 894.797 707.354C894.663 707.677 894.467 707.971 894.219 708.219C893.971 708.467 893.677 708.663 893.354 708.797C893.03 708.931 892.683 709 892.333 709H883.667C883.317 709 882.97 708.931 882.646 708.797C882.323 708.663 882.029 708.467 881.781 708.219C881.533 707.971 881.337 707.677 881.203 707.354C881.069 707.03 881 706.683 881 706.333V697.667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M878.012 704.737C877.705 704.563 877.45 704.31 877.272 704.005C877.094 703.7 877 703.353 877 703V693C877 691.9 877.9 691 879 691H889C889.75 691 890.158 691.385 890.5 692" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Warning triangle — tabler:info-triangle from bonuses.svg Vector_16+17 ─────
function WarnTriangle() {
  return (
    <svg width="22" height="20" viewBox="571 758 23 21" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M581.363 760.591L573.257 774.125C573.09 774.415 573.001 774.743 573 775.077C573 775.411 573.086 775.74 573.252 776.03C573.417 776.32 573.656 776.562 573.944 776.732C574.232 776.901 574.559 776.992 574.893 776.996H591.107C591.441 776.992 591.768 776.901 592.056 776.732C592.344 776.562 592.582 776.32 592.748 776.03C592.913 775.74 593 775.412 592.999 775.078C592.998 774.744 592.91 774.416 592.743 774.126L584.637 760.59C584.466 760.309 584.226 760.076 583.939 759.914C583.653 759.753 583.329 759.668 583 759.668C582.671 759.668 582.347 759.753 582.061 759.914C581.774 760.076 581.534 760.309 581.363 760.59M583 766H583.01" stroke="#9B9FB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M582 769H583V773H584" stroke="#9B9FB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Tab icons from bonuses.svg ─────────────────────────────────────────────────

// GiftIcon (ежедневные tab) — Vector_5 from bonuses.svg
function DailyIcon({ active }: { active?: boolean }) {
  const c = active ? ACCENT : '#9B9FB0'
  return (
    <svg width="22" height="22" viewBox="295 863.5 24 24" fill="none">
      <path d="M312.803 874.88H309.213C310.043 874.658 310.824 874.282 311.513 873.77C311.76 873.535 311.957 873.253 312.093 872.941C312.229 872.629 312.301 872.293 312.305 871.952C312.309 871.612 312.245 871.274 312.117 870.959C311.988 870.644 311.797 870.357 311.556 870.117C311.315 869.876 311.028 869.687 310.713 869.559C310.397 869.431 310.059 869.368 309.719 869.373C309.378 869.378 309.042 869.451 308.73 869.588C308.419 869.725 308.137 869.923 307.903 870.17C307.65 870.468 307.448 870.806 307.303 871.17C307.159 870.804 306.953 870.465 306.693 870.17C306.463 869.91 306.181 869.7 305.866 869.562C305.551 869.424 305.212 869.362 304.871 869.38C304.531 869.398 304.2 869.495 303.901 869.663C303.602 869.831 303.342 870.066 303.142 870.35C302.943 870.634 302.807 870.96 302.747 871.303C302.686 871.647 302.702 871.999 302.793 872.335C302.884 872.671 303.048 872.982 303.274 873.245C303.875 873.69 304.569 873.987 305.303 874.88H301.803C301.538 874.88 301.284 874.985 301.097 875.172C300.91 875.359 300.805 875.613 300.803 875.878V878.128C300.803 878.394 300.908 878.65 301.097 878.838C301.286 879.027 301.54 879.134 301.806 879.136H307.553V886.803C307.553 887.07 307.658 887.325 307.847 887.513C308.037 887.701 308.291 887.803 308.556 887.803H309.556C309.82 887.803 310.073 887.698 310.261 887.51C310.449 887.321 310.554 887.067 310.556 886.803V879.136H316.306C316.57 879.134 316.823 879.027 317.01 878.839C317.198 878.651 317.303 878.397 317.303 878.131V875.881C317.303 875.614 317.198 875.36 317.01 875.172C316.822 874.984 316.568 874.88 316.303 874.88H312.803Z" fill={c}/>
    </svg>
  )
}

// UserFriendsIcon (рефералы tab) — Vector_35 from bonuses.svg
function FriendsIcon({ active }: { active?: boolean }) {
  const c = active ? ACCENT : '#9B9FB0'
  return (
    <svg width="22" height="18" viewBox="997 800 22 18" fill="none">
      <path d="M1004 809C1005.93 809 1007.5 807.434 1007.5 805.5C1007.5 803.566 1005.93 802 1004 802C1002.07 802 1000.5 803.566 1000.5 805.5C1000.5 807.434 1002.07 809 1004 809ZM1006.4 810H1006.14C1005.49 810.312 1004.77 810.5 1004 810.5C1003.23 810.5 1002.51 810.312 1001.86 810H1001.6C999.612 810 998 811.613 998 813.6V814.5C998 815.328 998.672 816 999.5 816H1008.5C1009.33 816 1010 815.328 1010 814.5V813.6C1010 811.613 1008.39 810 1006.4 810ZM1013 809C1014.66 809 1016 807.656 1016 806C1016 804.344 1014.66 803 1013 803C1011.34 803 1010 804.344 1010 806C1010 807.656 1011.34 809 1013 809ZM1014.5 810H1014.38C1013.95 810.15 1013.49 810.25 1013 810.25C1012.51 810.25 1012.05 810.15 1011.62 810H1011.5C1010.86 810 1010.27 810.184 1009.76 810.481C1010.52 811.303 1011 812.394 1011 813.6V814.8C1011 814.869 1010.98 814.934 1010.98 815H1016.5C1017.33 815 1018 814.328 1018 813.5C1018 811.566 1016.43 810 1014.5 810Z" fill={c}/>
    </svg>
  )
}

// ── Countdown hook (same as TasksPage) ────────────────────────────────────────
function useCountdown(expiresAt: string | null) {
  const [rem, setRem] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRem(''); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const f = (n: number) => String(n).padStart(2, '0')
      setRem(`${f(d)} д : ${f(h)} ч : ${f(m)} м : ${f(s)} с`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return rem
}

// ── Daily task card — matches bonuses_daily tasks SVG screen ──────────────────
function DailyTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const countdown = useCountdown(task.expires_at)
  const isDone = task.user_status === 'completed'
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 12, border: '1px solid #EEECF9',
      padding: '16px', marginBottom: 10,
      boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
      opacity: isDone ? 0.75 : 1,
    }}>
      {/* Title */}
      <p style={{ fontSize: 15, fontWeight: 700, color: '#02020E', textAlign: 'center', marginBottom: 6, lineHeight: 1.3 }}>
        {task.title}
      </p>

      {/* Reward */}
      <p style={{ fontSize: 22, fontWeight: 800, color: ACCENT, textAlign: 'center', marginBottom: 10 }}>
        {parseFloat(task.reward).toFixed(0)} ₽
      </p>

      {/* Timer pill — dark background (from bonuses_daily tasks SVG) */}
      {countdown && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: '#2A2D3E', borderRadius: 16, padding: '6px 16px',
          width: '100%', boxSizing: 'border-box', marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
            {countdown}
          </span>
        </div>
      )}

      {/* Выполнить / Завершено button */}
      <button
        onClick={isDone ? undefined : onClick}
        style={{
          width: '100%', height: 44, borderRadius: 22, border: 'none',
          background: isDone ? '#E2F3EE' : GRAD,
          color: isDone ? '#047935' : '#fff',
          fontSize: 15, fontWeight: 700,
          cursor: isDone ? 'default' : 'pointer',
        }}
      >
        {isDone ? '✓ Выполнено' : 'Выполнить'}
      </button>
    </div>
  )
}

// ── Simple SVG bar chart for referral income ──────────────────────────────────
function ReferralIncomeChart({ data }: { data: ReferralIncomeDay[] }) {
  const maxVal = Math.max(...data.map(d => d.amount), 0.01)
  const barW = 16
  const gap = 4
  const chartH = 60
  const totalW = data.length * (barW + gap) - gap

  const monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

  return (
    <div style={{ padding: '0 16px', marginTop: 8 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#4D536D', marginBottom: 10, letterSpacing: 0.3 }}>
          ДОХОД ОТ РЕФЕРАЛОВ · 14 ДНЕЙ
        </p>
        <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + 18}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          {data.map((d, i) => {
            const barH = Math.max(2, (d.amount / maxVal) * chartH)
            const x = i * (barW + gap)
            const y = chartH - barH
            const hasIncome = d.amount > 0
            const date = new Date(d.date)
            const showLabel = i === 0 || i === data.length - 1 || date.getDate() === 1
            return (
              <g key={d.date}>
                <rect
                  x={x} y={y} width={barW} height={barH}
                  rx={3}
                  fill={hasIncome ? '#23C366' : '#EEECF9'}
                />
                {hasIncome && (
                  <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="#23C366" fontWeight={700}>
                    {d.amount.toFixed(0)}
                  </text>
                )}
                {showLabel && (
                  <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={8} fill="#9B9FB0">
                    {date.getDate()} {monthNames[date.getMonth()]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BonusesPage() {
  const navigate   = useNavigate()
  const { bonuses, setBonuses, user, tasks: storeTasks, setTasks } = useStore()
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'daily' | 'referrals'>('daily')
  const [incomeHistory, setIncomeHistory] = useState<ReferralIncomeDay[]>([])

  useEffect(() => {
    Promise.all([
      bonusesApi.get().then(({ data }) => setBonuses(data)),
      storeTasks.length === 0
        ? tasksApi.list({ page: 1, page_size: 20 }).then(({ data }) => setTasks(data.tasks, data.completed_today))
        : Promise.resolve(),
      bonusesApi.incomeHistory().then(({ data }) => setIncomeHistory(data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const copyLink = () => {
    if (!bonuses) return
    navigator.clipboard.writeText(bonuses.referral_link)
    showToast('Ссылка скопирована!', 'success')
  }

  const shareLink = () => {
    if (!bonuses) return
    const tg = window.Telegram?.WebApp
    const url = `https://t.me/share/url?url=${encodeURIComponent(bonuses.referral_link)}&text=${encodeURIComponent('Присоединяйся к TaskCash — зарабатывай выполняя задания! 💰')}`
    if (tg) tg.openTelegramLink(url)
    else window.open(url, '_blank')
  }

  if (loading) return <div className="loader"><div className="spinner" /></div>

  const level       = calcLevel(parseFloat(user?.total_earned ?? '0'))
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь'
  const refsCount   = bonuses?.referrals_count ?? 0
  const totalEarned = parseFloat(String(bonuses?.total_from_referrals || '0'))
  const shortLink   = (bonuses?.referral_link || '').replace('https://', '')

  // Available daily tasks (not completed, with expiry = daily-ish)
  const dailyTasks = storeTasks.filter(t => t.user_status !== 'completed').slice(0, 5)

  return (
    <div className="page" style={{ background: '#F5F5F5' }}>

      {/* ── Header — TASKCASH + user row ────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E6EE',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* TASKCASH title */}
        <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#02020E', letterSpacing: 0.5 }}>TASKCASH</span>
        </div>

        {/* User row — avatar + name + chevron + level badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 10px' }}>
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #EEECF9', flexShrink: 0 }} referrerPolicy="no-referrer" loading="eager"/>
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#9292A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user?.first_name || 'U')[0].toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#02020E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 1L5 5L1 9" stroke="#9B9FB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <LevelBadge level={level}/>
        </div>
      </div>

      {/* ── Tab bar — pill style matching bonuses.svg tabbar ────────────── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EEECF9',
        padding: '10px 16px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          background: '#F8F8FA',
          borderRadius: 25,
          border: '2px solid #fff',
          boxShadow: '0 0 0 1.5px #EEECF9',
          padding: 3,
          gap: 2,
        }}>
          {/* Ежедневные tab */}
          <button
            onClick={() => setTab('daily')}
            style={{
              flex: 1, height: 44, borderRadius: 22, border: 'none',
              background: tab === 'daily' ? ACCENT : 'transparent',
              color: tab === 'daily' ? '#fff' : '#9B9FB0',
              fontSize: 13, fontWeight: tab === 'daily' ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <DailyIcon active={tab === 'daily'} />
            Ежедневные
          </button>
          {/* Рефералы tab */}
          <button
            onClick={() => setTab('referrals')}
            style={{
              flex: 1, height: 44, borderRadius: 22, border: 'none',
              background: tab === 'referrals' ? ACCENT : 'transparent',
              color: tab === 'referrals' ? '#fff' : '#9B9FB0',
              fontSize: 13, fontWeight: tab === 'referrals' ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FriendsIcon active={tab === 'referrals'} />
            Рефералы
          </button>
        </div>
      </div>

      <div className="scroll-area">

        {/* ══ TAB: Ежедневные ═══════════════════════════════════════════════ */}
        {tab === 'daily' && (
          <div style={{ padding: '12px 16px 24px' }}>
            {/* Promo text — green, from bonuses.svg */}
            <p style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
              Выполнение этих задач откроет Premium задания
            </p>

            {dailyTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9B9FB0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#02020E', marginBottom: 6 }}>Нет доступных заданий</p>
                <p style={{ fontSize: 13 }}>Все задания на сегодня выполнены!</p>
              </div>
            ) : (
              dailyTasks.map(task => (
                <DailyTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                />
              ))
            )}
          </div>
        )}

        {/* ══ TAB: Рефералы ═════════════════════════════════════════════════ */}
        {tab === 'referrals' && (
          <>
            {/* Header: speaker illustration + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 0' }}>
              <SpeakerIllustration />
              <p style={{ fontSize: 16, fontWeight: 700, color: '#02020E', lineHeight: 1.3, flex: 1 }}>
                Пригласите друзей и зарабатывайте бонусы!
              </p>
            </div>

            {/* Stats card — rect 343×91 rx=12 white */}
            <div style={{
              margin: '12px 16px 0',
              background: '#FFFFFF', borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'stretch',
            }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#02020E', lineHeight: 1 }}>{refsCount}</div>
                <div style={{ fontSize: 12, color: '#9B9FB0', marginTop: 5 }}>Рефералов</div>
              </div>
              <div style={{ width: 1, background: '#EEECF9', margin: '14px 0' }}/>
              <div style={{ flex: 1, textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: refsCount > 0 ? ACCENT : '#02020E', lineHeight: 1 }}>
                  {totalEarned.toFixed(0)} ₽
                </div>
                <div style={{ fontSize: 12, color: '#9B9FB0', marginTop: 5 }}>Заработано</div>
              </div>
            </div>

            {/* Referral income chart */}
            {incomeHistory.length > 0 && incomeHistory.some(d => d.amount > 0) && (
              <ReferralIncomeChart data={incomeHistory} />
            )}

            {/* "Данные обновляются раз в 10 минут" */}
            <p style={{ fontSize: 11, color: '#9B9FB0', textAlign: 'center', padding: '6px 16px 0' }}>
              Данные обновляются раз в 10 минут
            </p>

            {/* Empty state — shown when no referrals */}
            {refsCount === 0 && (
              <div style={{ textAlign: 'center', padding: '8px 16px 0' }}>
                <p style={{ fontSize: 13, color: '#9B9FB0', marginBottom: 4 }}>У вас пока нет рефералов</p>
                <p style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>Поделитесь ссылкой с друзьями!</p>
              </div>
            )}

            {/* Referral link section */}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4D536D', padding: '14px 16px 0' }}>
              Ваша реферальная ссылка
            </p>

            {/* Link field + copy button */}
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px 0' }}>
              <div style={{
                flex: 1, background: '#E2F3EE', borderRadius: 8, height: 48,
                display: 'flex', alignItems: 'center', paddingLeft: 14, overflow: 'hidden',
              }}>
                <span style={{ fontSize: 12, color: '#4D536D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortLink || '—'}
                </span>
              </div>
              <button
                onClick={copyLink}
                style={{
                  width: 48, height: 48, borderRadius: 8,
                  background: GRAD, border: 'none', cursor: 'pointer',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CopyIconSvg />
              </button>
            </div>

            {/* Warning block — rect fill=#EEECF9 + triangle icon */}
            <div style={{
              margin: '10px 16px 0',
              background: '#EEECF9', borderRadius: 8, padding: '10px 12px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <WarnTriangle />
              <p style={{ fontSize: 11, color: '#9B9FB0', lineHeight: 1.5 }}>
                Каждый реферал проходит проверку; при выявлении накрутки аккаунт блокируется без восстановления.
              </p>
            </div>

            {/* Share button — "Поделиться ссылкой" */}
            <div style={{ padding: '12px 16px 0' }}>
              <button
                onClick={shareLink}
                style={{
                  width: '100%', height: 48, borderRadius: 24, border: 'none',
                  background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Поделиться ссылкой
              </button>
            </div>

            {/* Friends list — shown when referrals exist */}
            {bonuses && bonuses.referrals.length > 0 && (
              <div style={{ padding: '16px 16px 0' }}>
                {/* "👥 ДРУЗЬЯ" header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FriendsIcon active />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#02020E', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Друзья
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bonuses.referrals.map((ref: Referral, i: number) => (
                    <div key={ref.telegram_id} style={{
                      background: '#FFFFFF', borderRadius: 12, border: '1px solid #EEECF9',
                      display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10,
                    }}>
                      {/* Number badge — circle with index */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 11,
                        background: '#F8F8FA', border: '1px solid #EEECF9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#4D536D', flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      {/* Avatar — gray circle (D9D9D9 fill from SVG) with active dot */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: '#D9D9D9' }}/>
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: 5,
                          background: ref.is_active ? ACCENT : '#9B9FB0',
                          border: '1.5px solid #fff',
                        }}/>
                      </div>
                      {/* Name + status */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#02020E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ref.first_name}
                          {ref.username && <span style={{ fontWeight: 400, color: '#9B9FB0', fontSize: 12 }}> @{ref.username}</span>}
                        </p>
                        <p style={{ fontSize: 11, color: ref.is_active ? ACCENT : '#9B9FB0', marginTop: 1 }}>
                          {ref.is_active ? 'Активен' : 'Не активен'}
                        </p>
                      </div>
                      {/* Earned */}
                      <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        +{parseFloat(String(ref.earned_from)).toFixed(0)} ₽
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height: 24 }}/>
          </>
        )}

      </div>
    </div>
  )
}
