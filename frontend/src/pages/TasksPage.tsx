import { useEffect, useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tasksApi, settingsApi } from '../api/client'
import { useStore } from '../store'
import { calcLevel } from '../utils/level'
import LevelBadge from '../components/LevelBadge'
import type { Task, SortType } from '../types'

// ── Brand constants (from tasks.svg / components.svg) ─────────────────────────
const GRAD   = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)'
const ACCENT = '#23C366'
const BANNER_GRAD = 'linear-gradient(135deg, #1A44C2 0%, #0D9CE8 50%, #23C366 100%)'

// ── SVG icons extracted directly from tasks.svg ───────────────────────────────

// bi:fire — exact path from tasks.svg Vector_5, viewBox 158 341 20 26
function FireIcon() {
  return (
    <svg width="18" height="22" viewBox="158 341 20 26" fill="none">
      <path d="M168 366C172.971 366 177 363 177 357.75C177 355.5 176.25 351.75 173.25 348.75C173.625 351 171.375 351.75 171.375 351.75C172.5 348 169.5 342.75 165 342C165.536 345 165.75 348 162 351C160.125 352.5 159 355.094 159 357.75C159 363 163.029 366 168 366Z"
        fill="url(#fireGrad)"/>
      <defs>
        <linearGradient id="fireGrad" x1="168" y1="342" x2="168" y2="366" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD900"/>
          <stop offset="1" stopColor="#FF5A1F"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// material-symbols:timer-outline-rounded — exact path from tasks.svg Vector_6
function TimerIcon() {
  return (
    <svg width="14" height="12" viewBox="229 801 16 14" fill="none">
      <path d="M230.667 803C230.478 803 230.32 802.936 230.192 802.808C230.064 802.68 230 802.522 230 802.334C230 802.145 230.064 801.987 230.192 801.859C230.32 801.731 230.479 801.667 230.667 801.667H233.333C233.522 801.667 233.681 801.731 233.809 801.859C233.937 801.987 234 802.146 234 802.334C234 802.522 233.936 802.68 233.808 802.808C233.68 802.936 233.522 803 233.333 803H230.667ZM232 814C231.077 814 230.204 813.825 229.38 813.474C228.557 813.118 227.836 812.635 227.22 812.02C226.604 811.404 226.121 810.683 225.77 809.86C225.419 809.036 225.241 808.163 225.234 807.24V807C225.234 806.077 225.411 805.204 225.764 804.38C226.118 803.557 226.601 802.836 227.214 802.22C227.83 801.604 228.551 801.121 229.374 800.77C230.197 800.419 231.074 800.241 232.004 800.234H232.244C233.167 800.234 234.04 800.411 234.864 800.764C235.687 801.118 236.408 801.601 237.024 802.214C237.64 802.83 238.123 803.551 238.474 804.374C238.825 805.197 239.003 806.074 239.01 807.004V807.244C239.01 808.167 238.833 809.04 238.48 809.864C238.126 810.687 237.643 811.408 237.03 812.024C236.414 812.64 235.693 813.123 234.87 813.474C234.046 813.825 233.17 814 232.24 814H232ZM232 812.667C233.483 812.667 234.741 812.154 235.774 811.127C236.807 810.1 237.32 808.85 237.314 807.374V807.334C237.28 805.851 236.763 804.601 235.76 803.587C234.757 802.574 233.507 802.071 232.01 802.077H231.97C230.487 802.111 229.237 802.628 228.224 803.631C227.21 804.634 226.707 805.884 226.714 807.38V807.42C226.747 808.904 227.264 810.154 228.267 811.167C229.27 812.181 230.517 812.68 232 812.667ZM232 808.167C231.816 808.167 231.659 808.1 231.529 807.967C231.399 807.833 231.334 807.674 231.334 807.49V804.49C231.334 804.306 231.4 804.149 231.534 804.019C231.667 803.889 231.827 803.824 232.014 803.824C232.197 803.824 232.355 803.891 232.484 804.024C232.614 804.157 232.679 804.317 232.674 804.504V806.834H233.994C234.177 806.834 234.334 806.9 234.464 807.034C234.594 807.167 234.659 807.327 234.659 807.514C234.659 807.697 234.592 807.855 234.459 807.984C234.326 808.114 234.166 808.179 233.979 808.174L232 808.167Z"
        fill="#9B9FB0"/>
    </svg>
  )
}

// VIP badge — exact from tasks.svg badge VIP (red arrow shape)
function VipBadge() {
  return (
    <div style={{ position: 'absolute', left: 0, bottom: 0, overflow: 'hidden', borderRadius: '0 0 0 11px' }}>
      <svg width="70" height="22" viewBox="136 929 70 22" fill="none">
        <path d="M136 929H206L196.602 939.809L206 950H136V929Z" fill="#FE5A5B"/>
        <path d="M166.806 941.87H166.942L168.398 935H171.748L168.809 944.864H164.939L162 935H165.35L166.806 941.87Z" fill="white"/>
        <path d="M175.787 944.864H172.889V935H175.787V944.864Z" fill="white"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M181.966 935C182.736 935 183.401 935.148 183.962 935.444C184.527 935.741 184.962 936.158 185.268 936.695C185.577 937.233 185.732 937.867 185.732 938.596V938.609C185.732 939.339 185.577 939.97 185.268 940.508C184.962 941.045 184.527 941.462 183.962 941.758C183.401 942.055 182.736 942.203 181.966 942.203H180.512V944.864H177.614V935H181.966ZM180.512 937.449V939.754H181.748C182.105 939.754 182.381 939.659 182.576 939.468C182.772 939.274 182.869 939.01 182.869 938.677V938.663C182.869 938.335 182.772 938.073 182.576 937.878C182.381 937.679 182.105 937.58 181.748 937.58L180.512 937.449Z" fill="white"/>
      </svg>
    </div>
  )
}

// Days of week abbreviations
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const DAILY_MAX = 5

// calcLevel is imported from utils/level

// Tab definitions matching SVG: Новые / В процессе / Выполненные
type StatusTab = 'new' | 'in_progress' | 'done'

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'new',         label: 'Новые' },
  { key: 'in_progress', label: 'В процессе' },
  { key: 'done',        label: 'Выполненные' },
]

const PAGE_SIZE = 20

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining(''); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const fmt = (n: number) => String(n).padStart(2, '0')
      setRemaining(`${fmt(d)} д : ${fmt(h)} ч : ${fmt(m)} м : ${fmt(s)} с`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return remaining
}

// ─── Task card (matches tasks.svg card layout) ─────────────────────────────────
function TaskCardItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const isDone     = task.user_status === 'completed'
  const isChecking = task.user_status === 'checking'
  const isProgress = task.user_status === 'in_progress'
  const countdown  = useCountdown(task.expires_at)
  const isVip      = task.is_vip === true

  return (
    <div
      onClick={isDone ? undefined : onClick}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #EEECF9',
        marginBottom: 10,
        overflow: 'hidden',
        cursor: isDone ? 'default' : 'pointer',
        opacity: isDone ? 0.75 : 1,
        boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 8px', gap: 10, minHeight: 80 }}>
        {/* Image / icon area — 76×80 rx=12 from tasks.svg */}
        <div style={{
          width: 72, height: 72, borderRadius: 12, flexShrink: 0,
          background: '#F8F8FA', border: '1px solid #EEECF9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {task.icon_url
            ? <img src={task.icon_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}/>
            : <span style={{ fontSize: 32 }}>
                {{ subscribe: '📢', like: '❤️', watch_ad: '▶️', invite: '🤝' }[task.task_type] || '🎯'}
              </span>
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <p style={{ fontSize: 14, fontWeight: 700, color: '#02020E', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {task.title}
          </p>
          {/* Subtitle / description */}
          {task.description && (
            <p style={{ fontSize: 12, color: '#9B9FB0', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
              {task.description}
            </p>
          )}
          {/* Timer row */}
          {countdown && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <TimerIcon />
              <span style={{ fontSize: 11, color: '#9B9FB0' }}>{countdown}</span>
            </div>
          )}
          {/* Status badge */}
          {(isProgress || isChecking) && (
            <span style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
              background: isChecking ? '#FDF3CD' : '#E2F3EE',
              color: isChecking ? '#8B6200' : ACCENT,
            }}>
              {isChecking ? 'Проверяем…' : 'В процессе'}
            </span>
          )}
        </div>

        {/* Reward / status button — 112×40 rx=20 gradient (tasks.svg small button) */}
        <div style={{ flexShrink: 0 }}>
          {isDone ? (
            <div style={{ width: 84, height: 40, borderRadius: 20, background: '#E2F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#047935' }}>
              Завершен
            </div>
          ) : (
            <div style={{ width: 84, height: 40, borderRadius: 20, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>
              {parseFloat(task.reward).toFixed(0)} ₽
            </div>
          )}
        </div>
      </div>

      {/* VIP badge — exact from tasks.svg badge VIP */}
      {isVip && !isDone && <VipBadge />}
    </div>
  )
}

// ─── News banner card — from tasks.svg banner/timer layout ────────────────────
function NewsBanner({ featuredTask, bannerBudget, bannerTitle }: { featuredTask: Task | null; bannerBudget: string; bannerTitle: string }) {
  const countdown = useCountdown(featuredTask?.expires_at ?? null)
  const navigate = useNavigate()
  return (
    <div
      onClick={() => featuredTask && navigate(`/tasks/${featuredTask.id}`)}
      style={{
        minWidth: 'calc(100vw - 32px)',
        maxWidth: 'calc(100vw - 32px)',
        height: 150,
        borderRadius: 12,
        background: BANNER_GRAD,
        border: '1px solid #EEECF9',
        padding: '16px 18px',
        cursor: featuredTask ? 'pointer' : 'default',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
      }}
    >
      {/* Background decoration */}
      <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
      <div style={{ position: 'absolute', right: 20, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}/>

      {/* Бюджет label — dynamic from admin settings */}
      <p style={{ fontSize: 13, fontWeight: 800, color: '#FFD700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
        БЮДЖЕТ {bannerBudget} Р
      </p>
      {/* Task title */}
      <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 6, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {featuredTask?.title || bannerTitle}
      </p>

      {/* Timer pill — rect rx=16.5 white from tasks.svg timer group */}
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        background: '#fff', borderRadius: 16.5,
        padding: '5px 14px', marginTop: 10, gap: 4,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#02020E' }}>
          {countdown || '00 д : 00 ч : 00 м : 00 с'}
        </span>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const navigate = useNavigate()
  const { completedToday, setTasks, user } = useStore()
  const [tasks, setLocalTasks] = useState<Task[]>([])
  const [tab, setTab] = useState<StatusTab>('new')
  const [sort, setSort] = useState<SortType>('default')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [onlineCount, setOnlineCount] = useState(0)
  const [bannerBudget, setBannerBudget] = useState<string>('3.000.000')
  const [bannerTitle, setBannerTitle] = useState<string>('Новые задания уже ждут вас')

  const allTasksRef = useRef<Task[]>([])
  const level = calcLevel(parseFloat(user?.total_earned ?? '0'))

  const load = useCallback(async (s: SortType, p: number) => {
    if (p === 1) {
      allTasksRef.current = []
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const { data } = await tasksApi.list({ sort: s, page: p, page_size: PAGE_SIZE })
      allTasksRef.current = p === 1 ? data.tasks : [...allTasksRef.current, ...data.tasks]
      setLocalTasks([...allTasksRef.current])
      setTasks([...allTasksRef.current], data.completed_today)
      setPage(data.page)
      setTotalPages(data.pages)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [setTasks])

  useEffect(() => { load(sort, 1) }, [sort])

  useEffect(() => {
    settingsApi.public().then(({ data }) => {
      if (data.banner_budget) {
        const n = parseFloat(data.banner_budget)
        if (!isNaN(n)) setBannerBudget(n.toLocaleString('ru').replace(',', '.'))
      }
      if (data.banner_title) setBannerTitle(data.banner_title)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchOnline = () => {
      settingsApi.online().then(({ data }) => {
        if (data.online != null) setOnlineCount(data.online)
      }).catch(() => {})
    }
    fetchOnline()
    const id = setInterval(fetchOnline, 60_000)
    return () => clearInterval(id)
  }, [])

  // Filter by status tab
  const filtered = tasks.filter((t) => {
    if (tab === 'new')         return !t.user_status || t.user_status === 'failed' || t.user_status === 'expired'
    if (tab === 'in_progress') return t.user_status === 'in_progress' || t.user_status === 'checking'
    return t.user_status === 'completed'
  })

  // Featured task for banner (highest reward with expires_at)
  const featured = tasks.find(t => t.expires_at && !t.user_status)
    || tasks.find(t => !t.user_status)
    || null

  // Today's day of week (0=Sun → 6=Sat, but we want Mon=0)
  const todayIdx = (new Date().getDay() + 6) % 7

  const progressPct = Math.min(100, (completedToday / DAILY_MAX) * 100)

  return (
    <div className="page" style={{ background: '#F5F5F5' }}>

      {/* ── Top nav — white bar with TASKCASH title (from tasks.svg TopNavigation) ── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E6EE',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* TASKCASH title row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 0',
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#02020E', letterSpacing: 0.5 }}>TASKCASH</span>
          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSort(sort === 'default' ? 'reward_desc' : 'default')}
              style={{
                width: 34, height: 34, borderRadius: 17,
                border: '1.5px solid #EEECF9',
                background: sort !== 'default' ? ACCENT : '#fff',
                color: sort !== 'default' ? '#fff' : '#4D536D',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ⇅
            </button>
          </div>
        </div>

        {/* User info bar — header/user from tasks.svg */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 10px' }}>
          {/* Online user avatars — 3 circles with green border */}
          <div style={{ display: 'flex', marginRight: 2 }}>
            {[0,1,2].map((i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 14,
                background: `hsl(${i*40},30%,75%)`,
                border: '1.5px solid #23C366',
                marginLeft: i === 0 ? 0 : -8,
                zIndex: 3 - i,
                overflow: 'hidden',
              }}>
                {user?.photo_url && i === 0 && (
                  <img src={user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer"/>
                )}
              </div>
            ))}
          </div>
          {/* Green dot + count */}
          <div style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT, flexShrink: 0 }}/>
          <p style={{ fontSize: 12, color: '#9B9FB0', flex: 1 }}>
            Пользователей в сети: <strong style={{ color: '#02020E' }}>{onlineCount.toLocaleString()}</strong>
          </p>
          {/* User name + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#02020E', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь'}
            </span>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path d="M1 1L5 5L1 9" stroke="#9B9FB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <LevelBadge level={level}/>
          </div>
        </div>

        {/* ── Streak card — rect 343×129 rx=12 white, from tasks.svg Streak ── */}
        <div style={{
          margin: '0 16px 12px',
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #EEECF9',
          boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
          padding: '14px 16px',
        }}>
          {/* Fire + streak text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FireIcon />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#02020E' }}>
              Сегодня выполнено
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>
              {completedToday}/{DAILY_MAX}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#02020E' }}>заданий</span>
          </div>

          {/* Progress bar — 303×8 rx=4 #EEECF9 track + gradient fill */}
          <div style={{ height: 8, borderRadius: 4, background: '#EEECF9', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 4, background: GRAD, transition: 'width 0.4s ease' }}/>
          </div>

          {/* Day circles — Пн Вт Ср Чт Пт Сб Вс */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {DAYS.map((day, i) => {
              const isToday = i === todayIdx
              const isPast  = i < todayIdx
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#02020E' : '#4D536D' }}>{day}</span>
                  {/* Circle: completed days filled green, today = border green, future = border gray */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 11,
                    background: isPast && completedToday > 0 ? ACCENT : 'transparent',
                    border: `1.5px solid ${isPast && completedToday > 0 ? ACCENT : isToday ? ACCENT : '#9B9FB0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isPast && completedToday > 0 && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── News / Banners section ─────────────────────────────────────── */}
      {!loading && tasks.length > 0 && (
        <div style={{ flexShrink: 0, paddingTop: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#02020E', padding: '0 16px 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            НОВОСТИ СЕРВИСА
          </p>
          {/* Horizontal scroll — from tasks.svg banners group */}
          <div style={{
            display: 'flex', gap: 12, paddingLeft: 16, paddingRight: 16,
            overflowX: 'auto', scrollSnapType: 'x mandatory',
            paddingBottom: 2,
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            <NewsBanner featuredTask={featured} bannerBudget={bannerBudget} bannerTitle={bannerTitle} />
          </div>
        </div>
      )}

      {/* ── Status tabs — rect 341×50 rx=25 stroke=white 2px (tasks.svg tabs) ── */}
      <div style={{
        padding: '12px 16px 0',
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
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 22,
                border: 'none',
                fontSize: 13,
                fontWeight: tab === key ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: tab === key ? ACCENT : 'transparent',
                color: tab === key ? '#fff' : '#9B9FB0',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Task list ─────────────────────────────────────────────────── */}
      <div className="scroll-area" style={{ padding: '12px 16px 0' }}>
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 32px', color: '#9B9FB0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {{ new: '🎯', in_progress: '⏳', done: '✅' }[tab]}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#02020E', marginBottom: 6 }}>
              {{ new: 'Новых заданий нет', in_progress: 'Нет активных заданий', done: 'Нет выполненных заданий' }[tab]}
            </p>
            <p style={{ fontSize: 13, color: '#9B9FB0' }}>
              {{ new: 'Скоро появятся новые задания', in_progress: 'Выберите задание из раздела «Новые»', done: 'Выполните задания чтобы видеть их здесь' }[tab]}
            </p>
          </div>
        ) : (
          <>
            {filtered.map((task) => (
              <TaskCardItem
                key={task.id}
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
            {page < totalPages && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <button
                  onClick={() => load(sort, page + 1)}
                  disabled={loadingMore}
                  style={{
                    padding: '9px 28px', borderRadius: 100,
                    border: `1.5px solid ${ACCENT}`, background: 'none', color: ACCENT,
                    fontWeight: 600, fontSize: 13, cursor: loadingMore ? 'default' : 'pointer',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
            <div style={{ height: 16 }}/>
          </>
        )}
      </div>
    </div>
  )
}
