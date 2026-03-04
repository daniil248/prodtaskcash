import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { tasksApi } from '../api/client'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import type { UserTaskStatus } from '../types'

// SVG-exact colors from task_subscribtion.svg / task_like.svg / task_ADS.svg
const GRAD    = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)'
const ORANGE  = '#FA8D28'   // "Проверить" button — task_like.svg
const GREY    = '#9B9FB0'   // disabled button
const ACCENT  = '#23C366'
const STEP_BG = '#E2F3EE'   // step circle bg — 32×32, rx=16

// Close X button — 28×28, rx=14, white bg (from task_subscribtion.svg)
function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      style={{
        width: 28, height: 28, borderRadius: 14,
        background: '#fff',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 6px rgba(2,2,14,0.12)',
        flexShrink: 0,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="#02020E" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

// Step circle — 32×32, rx=16, fill=#E2F3EE, number in #23C366 (from SVG)
function StepCircle({ n }: { n: number }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 16,
      background: STEP_BG, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color: ACCENT,
    }}>
      {n}
    </div>
  )
}

// Type labels for steps title
const TYPE_STEP_LABELS: Record<string, { title: string; steps: string[] }> = {
  subscribe: {
    title: 'Как выполнить',
    steps: ['Нажмите «Перейти» ниже', 'Подпишитесь на канал', 'Вернитесь и нажмите «Проверить»'],
  },
  like: {
    title: 'Как выполнить',
    steps: ['Нажмите «Перейти» ниже', 'Поставьте лайк на пост', 'Вернитесь и нажмите «Проверить»'],
  },
  watch_ad: {
    title: 'Как выполнить',
    steps: ['Нажмите «Смотреть»', 'Дождитесь окончания таймера', 'Нажмите «Проверить»'],
  },
  invite: {
    title: 'Как выполнить',
    steps: ['Скопируйте реферальную ссылку', 'Поделитесь с другом', 'Друг должен зарегистрироваться'],
  },
}

// Reward box — 303×48, rx=12, fill=#E2F3EE (from SVG)
function RewardBox({ reward }: { reward: string }) {
  return (
    <div style={{
      height: 48, borderRadius: 12,
      background: STEP_BG,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 10,
      marginBottom: 14,
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill={ACCENT} opacity="0.15"/>
        <text x="10" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill={ACCENT}>₽</text>
      </svg>
      <span style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>
        +{parseFloat(reward).toFixed(0)}₽
      </span>
      <span style={{ fontSize: 12, color: '#4D536D' }}>начислится после проверки</span>
    </div>
  )
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tasks, updateTask } = useStore()
  const task = tasks.find((t) => t.id === Number(id))

  const [status, setStatus]       = useState<UserTaskStatus | null>(task?.user_status ?? null)
  const [, setUserTaskId]          = useState<number | null>(task?.user_task_id ?? null)
  const [timeLeft, setTimeLeft]   = useState<number>(0)
  const [loading, setLoading]     = useState(false)
  const [adStarted, setAdStarted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const adDuration = useRef<number>(0)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current)  clearInterval(pollRef.current)
  }, [])

  // Reset ad timer on tab hide (ТЗ 3.2.3)
  useEffect(() => {
    if (!adStarted || task?.task_type !== 'watch_ad') return
    const handler = () => {
      if (document.hidden && timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setTimeLeft(adDuration.current)
        setAdStarted(false)
      }
    }
    window.Telegram?.WebApp?.onEvent('viewportChanged', handler)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [adStarted, task])

  useEffect(() => { if (status === 'checking') startPolling() }, [status])

  if (!task) { navigate('/tasks', { replace: true }); return null }

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await tasksApi.list()
        const updated = data.tasks.find((t: { id: number }) => t.id === task.id)
        if (updated && updated.user_status !== 'checking') {
          clearInterval(pollRef.current!)
          setStatus(updated.user_status)
          updateTask(updated)
          if (updated.user_status === 'completed') {
            showToast(`+${parseFloat(task.reward).toFixed(0)}₽ начислено!`, 'success')
          } else if (updated.user_status === 'failed') {
            showToast(updated.error_message || 'Задание не выполнено', 'error')
          }
        }
      } catch {}
    }, 2500)
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const { data } = await tasksApi.start(task.id)
      setUserTaskId(data.user_task_id)
      setStatus('in_progress')
      updateTask({ ...task, user_status: 'in_progress', user_task_id: data.user_task_id })

      if (task.task_type === 'watch_ad' && task.duration_seconds) {
        adDuration.current = task.duration_seconds
        setTimeLeft(task.duration_seconds)
        setAdStarted(true)
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
            return prev - 1
          })
        }, 1000)
      }
      if (task.external_url && task.task_type !== 'watch_ad') {
        window.open(task.external_url, '_blank')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ошибка'
      showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const handleCheck = async () => {
    setLoading(true)
    try {
      await tasksApi.check(task.id)
      setStatus('checking')
      updateTask({ ...task, user_status: 'checking' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Ошибка'
      showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const isDone    = status === 'completed'
  const isChecking = status === 'checking'
  const canCheck  = status === 'in_progress' && (
    task.task_type !== 'watch_ad' || (adStarted && timeLeft === 0)
  )

  const typeConfig = TYPE_STEP_LABELS[task.task_type] || TYPE_STEP_LABELS.subscribe
  const customSteps = task.instruction
    ? task.instruction.split('\n').filter(Boolean)
    : typeConfig.steps

  // Ad timer progress (0–100)
  const adProgress = adDuration.current > 0
    ? Math.round(((adDuration.current - timeLeft) / adDuration.current) * 100)
    : 0

  return (
    // Dark overlay background — exactly as task_subscribtion.svg (#5A5A5A overlay)
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(2,2,14,0.6)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end',
      zIndex: 10,
    }}>
      {/* Tap backdrop to go back */}
      <div style={{ flex: 1 }} onClick={() => navigate('/tasks')} />

      {/* Card — 343×auto, rx=20, fill=#F5F5F5, stroke=#EEECF9 — from SVG */}
      <div style={{
        background: '#F5F5F5',
        borderRadius: '20px 20px 0 0',
        border: '1px solid #EEECF9',
        maxHeight: '88vh',
        overflowY: 'auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}>
        {/* Card header */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {/* Type label */}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#4D536D', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {{ subscribe: 'Подписка', like: 'Лайк', watch_ad: 'Реклама', invite: 'Приглашение' }[task.task_type] || task.task_type}
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#02020E', lineHeight: 1.3 }}>
              {task.title}
            </h1>
            {task.description && (
              <p style={{ fontSize: 13, color: '#4D536D', marginTop: 5, lineHeight: 1.4 }}>
                {task.description}
              </p>
            )}
          </div>
          {/* Close button — 28×28, rx=14, white bg (exact from SVG) */}
          <CloseBtn onClose={() => navigate('/tasks')} />
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          {/* Reward box — 303×48, rx=12, #E2F3EE */}
          <RewardBox reward={task.reward} />

          {/* Ad timer progress bar */}
          {task.task_type === 'watch_ad' && adStarted && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 8, borderRadius: 4, background: '#EEECF9', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: GRAD,
                  width: `${adProgress}%`,
                  transition: 'width 1s linear',
                }} />
              </div>
              {timeLeft > 0 ? (
                <p style={{ fontSize: 13, color: '#8B6200', fontWeight: 600, textAlign: 'center' }}>
                  Подождите ещё {timeLeft} сек…
                </p>
              ) : (
                <p style={{ fontSize: 13, color: ACCENT, fontWeight: 600, textAlign: 'center' }}>
                  ✓ Готово! Нажмите «Проверить»
                </p>
              )}
            </div>
          )}

          {/* Completed state */}
          {isDone && (
            <div style={{
              background: '#E2F3EE', borderRadius: 16, padding: 20,
              textAlign: 'center', marginBottom: 16,
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#047935' }}>Задание выполнено!</p>
              <p style={{ fontSize: 13, color: ACCENT, marginTop: 4 }}>
                +{parseFloat(task.reward).toFixed(0)}₽ начислено на баланс
              </p>
            </div>
          )}

          {/* Checking state */}
          {isChecking && (
            <div style={{
              background: '#FDF3CD', borderRadius: 16, padding: 16,
              textAlign: 'center', marginBottom: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div className="spinner" style={{ borderColor: '#FDE047', borderTopColor: '#8B6200' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#8B6200' }}>Проверяем выполнение…</p>
              <p style={{ fontSize: 12, color: '#8B6200' }}>Займёт несколько секунд</p>
            </div>
          )}

          {/* Steps — from SVG: 32×32 circle, #E2F3EE bg, #23C366 text */}
          {!isDone && (
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid #EEECF9',
              overflow: 'hidden', marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#02020E', padding: '12px 16px 8px' }}>
                {typeConfig.title}
              </p>
              {customSteps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 16px',
                  borderTop: i > 0 ? '1px solid #EEECF9' : 'none',
                }}>
                  <StepCircle n={i + 1} />
                  <p style={{ fontSize: 13, color: '#02020E', lineHeight: 1.4, paddingTop: 7, flex: 1 }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons — gradient / orange / grey (exact from SVG) */}
          {!isDone && !isChecking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 }}>
              {/* Primary: "Начать" / "Смотреть" — gradient button (303×40, rx=20) */}
              {!status && (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  style={{
                    height: 48, borderRadius: 24, border: 'none',
                    background: loading ? GREY : GRAD,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {loading
                    ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    : task.task_type === 'watch_ad' ? '▶️ Смотреть рекламу'
                    : task.task_type === 'subscribe' ? '📢 Перейти и подписаться'
                    : task.task_type === 'like' ? '❤️ Поставить лайк'
                    : '🚀 Начать задание'
                  }
                </button>
              )}

              {/* If in_progress + external link: re-open link */}
              {status === 'in_progress' && task.external_url && task.task_type !== 'watch_ad' && (
                <button
                  onClick={() => window.open(task.external_url!, '_blank')}
                  style={{
                    height: 48, borderRadius: 24, border: 'none',
                    background: GRAD, color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  ↗ Открыть снова
                </button>
              )}

              {/* Watch ad in progress + not started yet */}
              {status === 'in_progress' && task.task_type === 'watch_ad' && !adStarted && task.external_url && (
                <button
                  onClick={() => window.open(task.external_url!, '_blank')}
                  style={{
                    height: 48, borderRadius: 24, border: 'none',
                    background: GRAD, color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ▶️ Открыть рекламу
                </button>
              )}

              {/* "Проверить" — orange button (FA8D28) when available; grey when waiting */}
              {canCheck && (
                <button
                  onClick={handleCheck}
                  disabled={loading}
                  style={{
                    height: 48, borderRadius: 24, border: 'none',
                    background: loading ? GREY : ORANGE,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {loading
                    ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    : '✓ Проверить выполнение'
                  }
                </button>
              )}

              {/* Grey disabled "Проверить" when waiting */}
              {status === 'in_progress' && !canCheck && (
                <button
                  disabled
                  style={{
                    height: 48, borderRadius: 24, border: 'none',
                    background: GREY, color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: 'default', opacity: 0.7,
                  }}
                >
                  {task.task_type === 'watch_ad' && timeLeft > 0
                    ? `⏱ Ждите ${timeLeft}с…`
                    : 'Сначала выполните задание'}
                </button>
              )}
            </div>
          )}

          {/* Done: close button */}
          {isDone && (
            <button
              onClick={() => navigate('/tasks')}
              style={{
                height: 48, borderRadius: 24, border: 'none',
                background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', marginBottom: 4,
              }}
            >
              ← Вернуться к заданиям
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
