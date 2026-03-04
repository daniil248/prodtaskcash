import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tasksApi } from '../api/client'
import { useStore } from '../store'
import TaskCard from '../components/TaskCard'
import type { Task, TaskType, SortType } from '../types'

// SVG exact brand gradient (components.svg)
const GRAD = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)'

// EXACT paths from profile.svg — star hexagon + inner gear icon + corner triangles
function LevelBadge({ level }: { level: number }) {
  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <svg width="44" height="44" viewBox="136 365 48 48" fill="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="lbg" x1="136" y1="479.667" x2="200.349" y2="473.666" gradientUnits="userSpaceOnUse">
            <stop offset="0.434477" stopColor="#35DE66"/>
            <stop offset="0.581125" stopColor="#2CE1A1"/>
            <stop offset="1" stopColor="#02BBC7"/>
          </linearGradient>
        </defs>
        <path d="M158.708 367.76C159.504 367.287 160.496 367.288 161.292 367.761L169.445 372.6L169.463 372.61L169.48 372.62L177.748 377.262C178.556 377.715 179.051 378.573 179.04 379.499L178.926 388.979V389.021L179.04 398.501C179.051 399.427 178.556 400.285 177.748 400.738L169.48 405.38L169.463 405.39L169.445 405.4L161.292 410.239V410.24C160.496 410.713 159.504 410.713 158.708 410.24V410.239L150.555 405.4L150.537 405.39L150.52 405.38L142.252 400.738C141.444 400.285 140.949 399.427 140.96 398.501L141.074 389.021V388.979L140.96 379.499C140.949 378.573 141.444 377.715 142.252 377.262L150.52 372.62L150.537 372.61L150.555 372.6L158.708 367.76Z" fill="#F8F8FA" stroke="url(#lbg)" strokeWidth="3.42857"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M160 373.286C160.385 373.268 160.748 373.345 161.09 373.519C161.521 373.933 161.936 374.366 162.335 374.817C162.672 375.025 163.035 375.094 163.425 375.024C163.809 374.914 164.19 374.793 164.567 374.661C165.411 374.446 166.042 374.714 166.461 375.465C166.585 375.928 166.689 376.395 166.773 376.867C166.889 377.26 167.122 377.562 167.473 377.775C168.019 377.94 168.573 378.078 169.134 378.19C169.944 378.573 170.247 379.205 170.042 380.084C169.921 380.448 169.8 380.811 169.679 381.174C169.59 381.628 169.676 382.043 169.938 382.42C170.319 382.766 170.7 383.112 171.08 383.458C171.485 384.041 171.52 384.647 171.184 385.274C170.754 385.689 170.321 386.104 169.886 386.52C169.678 386.856 169.609 387.219 169.679 387.609C169.807 388.045 169.945 388.478 170.094 388.907C170.215 389.694 169.93 390.274 169.238 390.645C168.775 390.769 168.308 390.873 167.837 390.957C167.406 391.093 167.086 391.361 166.876 391.761C166.749 392.278 166.628 392.797 166.513 393.318C166.13 394.128 165.499 394.431 164.619 394.226C164.256 394.105 163.892 393.984 163.529 393.863C163.075 393.774 162.66 393.86 162.284 394.123C161.938 394.503 161.592 394.884 161.246 395.264C160.661 395.664 160.056 395.698 159.429 395.368C158.998 394.954 158.583 394.522 158.184 394.071C157.847 393.862 157.484 393.793 157.094 393.863C156.658 393.991 156.226 394.129 155.796 394.278C155.009 394.399 154.43 394.114 154.058 393.422C153.934 392.96 153.83 392.493 153.746 392.021C153.61 391.59 153.342 391.27 152.942 391.061C152.425 390.933 151.906 390.812 151.385 390.697C150.575 390.314 150.272 389.683 150.477 388.803C150.598 388.44 150.719 388.077 150.84 387.713C150.929 387.259 150.843 386.844 150.581 386.468C150.2 386.122 149.82 385.776 149.439 385.43C149.034 384.846 148.999 384.241 149.335 383.613C149.763 383.199 150.196 382.784 150.633 382.368C150.841 382.031 150.91 381.668 150.84 381.278C150.712 380.842 150.574 380.41 150.425 379.981C150.304 379.193 150.589 378.614 151.281 378.242C151.744 378.118 152.211 378.015 152.683 377.931C153.113 377.794 153.433 377.526 153.643 377.126C153.77 376.609 153.891 376.09 154.006 375.569C154.389 374.759 155.02 374.457 155.9 374.661C156.263 374.782 156.627 374.903 156.99 375.024C157.444 375.113 157.859 375.027 158.236 374.765C158.582 374.384 158.927 374.004 159.273 373.623C159.501 373.466 159.743 373.354 160 373.286ZM159.533 377.905C162.318 377.753 164.454 378.843 165.942 381.174C167.084 383.354 167.084 385.534 165.942 387.713C164.215 390.371 161.784 391.4 158.651 390.801C155.853 389.938 154.219 388.061 153.746 385.17C153.57 382.384 154.651 380.248 156.99 378.761C157.79 378.313 158.638 378.027 159.533 377.905Z" fill="url(#lbg)"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M146.974 396.276C146.974 396.121 146.974 395.965 146.974 395.809C148.391 394.349 149.836 392.913 151.307 391.502C151.678 391.586 152.05 391.664 152.423 391.735C152.589 391.779 152.736 391.857 152.864 391.969C153.024 392.46 153.145 392.962 153.227 393.474C153.478 394.165 153.936 394.667 154.603 394.979C153.245 396.362 151.879 397.737 150.503 399.105C150.227 399.293 149.977 399.267 149.75 399.027C149.709 398.308 149.718 397.59 149.776 396.873C149.766 396.704 149.697 396.565 149.569 396.458C148.756 396.441 147.943 396.423 147.13 396.406C147.084 396.352 147.032 396.309 146.974 396.276Z" fill="url(#lbg)"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M173.545 395.809C173.545 395.965 173.545 396.121 173.545 396.276C173.487 396.309 173.435 396.352 173.39 396.406C172.576 396.423 171.763 396.441 170.95 396.458C170.817 396.573 170.748 396.72 170.743 396.899C170.8 397.59 170.809 398.282 170.769 398.975C170.567 399.261 170.316 399.304 170.016 399.105C168.64 397.737 167.274 396.362 165.916 394.979C166.643 394.641 167.119 394.088 167.344 393.318C167.412 392.836 167.533 392.369 167.707 391.917C167.8 391.823 167.913 391.762 168.044 391.735C168.458 391.639 168.873 391.569 169.29 391.528C170.72 392.949 172.139 394.377 173.545 395.809Z" fill="url(#lbg)"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#23C366', lineHeight: 1 }}>{level}</span>
        <span style={{ fontSize: 7, fontWeight: 700, color: '#4D536D', letterSpacing: 0.5 }}>LVL</span>
      </div>
    </div>
  )
}

// Chevron right — from tasks.svg arrow path (#4D536D)
function ChevronRight() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1L6 6L1 11" stroke="#4D536D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

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

// Type filters — pills matching SVG filter tabs
const TYPE_FILTERS: { key: TaskType | 'all'; label: string }[] = [
  { key: 'all',       label: 'Все' },
  { key: 'subscribe', label: 'Подписка' },
  { key: 'like',      label: 'Лайк' },
  { key: 'watch_ad',  label: 'Реклама' },
  { key: 'invite',    label: 'Пригласить' },
]

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'default',     label: 'По умолчанию' },
  { key: 'reward_desc', label: '↓ Награда' },
  { key: 'reward_asc',  label: '↑ Награда' },
  { key: 'newest',      label: 'Новые' },
]

const PAGE_SIZE = 20

export default function TasksPage() {
  const navigate = useNavigate()
  const { completedToday, setTasks, user } = useStore()
  const [tasks, setLocalTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<TaskType | 'all'>('all')
  const [sort, setSort] = useState<SortType>('default')
  const [showSort, setShowSort] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const level = calcLevel(parseFloat(user?.total_earned || '0'))
  const xpPct = levelProgress(parseFloat(user?.total_earned || '0'))

  const load = useCallback(async (p: number, s: SortType, append = false) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const { data } = await tasksApi.list({ sort: s, page: p, page_size: PAGE_SIZE })
      setLocalTasks((prev) => append ? [...prev, ...data.tasks] : data.tasks)
      setTasks(data.tasks, data.completed_today)
      setTotalPages(data.pages)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [setTasks])

  useEffect(() => {
    setPage(1)
    setLocalTasks([])
    load(1, sort)
  }, [sort, load])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, sort, true)
  }

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.task_type === filter)

  return (
    <div className="page" style={{ background: '#F5F5F5' }}>

      {/* ── Top nav bar — white, exactly as SVG ─────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E6EE',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* User row — avatar + name + level badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px 10px',
        }}>
          {/* Avatar */}
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" style={{
              width: 40, height: 40, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: '1.5px solid #EEECF9',
            }} referrerPolicy="no-referrer"/>
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#9292A1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(user?.first_name || 'U')[0].toUpperCase()}
            </div>
          )}

          {/* Name + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#02020E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь'}
              </span>
              <ChevronRight />
            </div>
            <span style={{ fontSize: 12, color: '#9B9FB0' }}>
              Сегодня: <strong style={{ color: '#23C366' }}>{completedToday}</strong> заданий
            </span>
          </div>

          {/* Level badge — exact from SVG */}
          <LevelBadge level={level} />
        </div>

        {/* XP progress bar — 343×8, rx=4, #EEECF9 track, gradient fill */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ height: 8, borderRadius: 4, background: '#EEECF9', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${xpPct}%`,
              borderRadius: 4,
              background: GRAD,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#9B9FB0' }}>Уровень {level}</span>
            <span style={{ fontSize: 10, color: '#9B9FB0' }}>{xpPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* ── Filter pills + sort ──────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E6EE',
        flexShrink: 0,
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pills container — from SVG: 341×50, rx=25, border white 2px */}
          <div style={{
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            flex: 1,
            padding: '3px',
            background: '#F8F8FA',
            borderRadius: 25,
            border: '1.5px solid #EEECF9',
          }}>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 22,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                  // Active: green fill; inactive: transparent — exactly as SVG
                  background: filter === f.key ? '#23C366' : 'transparent',
                  color: filter === f.key ? '#fff' : '#9B9FB0',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort button */}
          <div ref={sortRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowSort((v) => !v)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                border: '1.5px solid #EEECF9',
                background: sort !== 'default' ? '#23C366' : '#fff',
                color: sort !== 'default' ? '#fff' : '#4D536D',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ⇅
            </button>
            {showSort && (
              <div style={{
                position: 'absolute', right: 0, top: '110%',
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(2,2,14,0.12)',
                overflow: 'hidden', zIndex: 200, minWidth: 180,
                border: '1px solid #EEECF9',
              }}>
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => { setSort(o.key); setShowSort(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '11px 16px',
                      textAlign: 'left', border: 'none', fontSize: 13,
                      fontWeight: sort === o.key ? 700 : 400,
                      background: sort === o.key ? '#E2F3EE' : '#fff',
                      color: sort === o.key ? '#23C366' : '#02020E',
                      cursor: 'pointer',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Task list ────────────────────────────────────────────────── */}
      <div className="scroll-area" style={{ padding: '12px 16px 0' }}>
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 32px', color: '#9B9FB0' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🎯</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#02020E', marginBottom: 6 }}>Заданий нет</p>
            <p style={{ fontSize: 13, color: '#9B9FB0' }}>Скоро появятся новые задания</p>
          </div>
        ) : (
          <>
            {filtered.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
            ))}

            {page < totalPages && (
              <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '11px 32px', borderRadius: 22,
                    border: 'none', background: GRAD,
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: loadingMore ? 'default' : 'pointer',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
