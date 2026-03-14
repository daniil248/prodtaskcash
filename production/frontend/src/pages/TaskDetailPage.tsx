import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { tasksApi, getApiErrorMessage } from '../api/client'
import { useStore } from '../store'
import { showToast } from '../components/Toast'
import type { UserTaskStatus } from '../types'

// ── Brand colors from task SVGs ───────────────────────────────────────────────
const GRAD   = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)'
const ORANGE = '#FA8D28'
const GREY   = '#9B9FB0'
const ACCENT = '#23C366'

// ── Close X button — 28×28 rx=14 white (iconamoon:close-fill from task SVGs) ──
function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      style={{
        width: 28, height: 28, borderRadius: 14,
        background: '#fff', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 6px rgba(2,2,14,0.12)',
        flexShrink: 0,
      }}
    >
      {/* iconamoon:close-fill path from task_ADS.svg Vector */}
      <svg width="10" height="10" viewBox="431 282 28 28" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M440.261 291.272C440.427 291.105 440.654 291.011 440.89 291.011C441.126 291.011 441.352 291.105 441.519 291.272L444.894 294.651L448.27 291.272C448.352 291.187 448.45 291.119 448.559 291.072C448.667 291.025 448.784 291 448.903 291C449.021 291 449.138 291.025 449.246 291.073C449.355 291.12 449.453 291.188 449.535 291.273C449.617 291.358 449.682 291.459 449.725 291.569C449.768 291.679 449.789 291.796 449.787 291.915C449.784 292.034 449.758 292.15 449.71 292.258C449.662 292.366 449.593 292.463 449.507 292.544L446.131 295.924L449.507 299.303C449.593 299.384 449.661 299.482 449.709 299.59C449.756 299.699 449.782 299.815 449.784 299.933C449.786 300.051 449.763 300.169 449.718 300.278C449.673 300.388 449.606 300.488 449.522 300.571C449.438 300.655 449.337 300.721 449.227 300.765C449.116 300.809 448.998 300.831 448.88 300.829C448.762 300.827 448.645 300.802 448.536 300.754C448.428 300.707 448.33 300.637 448.25 300.55L444.894 297.192L441.539 300.551C441.459 300.638 441.361 300.708 441.253 300.756C441.144 300.803 441.028 300.828 440.91 300.83C440.792 300.832 440.674 300.81 440.564 300.766C440.454 300.722 440.353 300.657 440.269 300.573C440.185 300.489 440.118 300.389 440.074 300.28C440.029 300.17 440.007 300.052 440.009 299.934C440.011 299.815 440.037 299.699 440.085 299.59C440.133 299.482 440.202 299.384 440.288 299.303L443.658 295.924L440.283 292.544C440.114 292.378 440.02 292.151 440.02 291.914C440.02 291.678 440.112 291.451 440.278 291.284L440.261 291.272Z" fill="#02020E"/>
      </svg>
    </button>
  )
}

// ── Step circle — 32×32 rx=16 #E2F3EE (from Frame 2087326678 in task SVGs) ────
function StepCircle({ n, done }: { n: number; done?: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 16,
      background: done ? ACCENT : '#E2F3EE',
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700,
      color: done ? '#fff' : ACCENT,
    }}>
      {done ? '✓' : n}
    </div>
  )
}

// ── Reward box — rect 303×48 rx=12 #E2F3EE + game-icons:two-coins ─────────────
function RewardBox({ reward }: { reward: string }) {
  return (
    <div style={{
      height: 48, borderRadius: 12,
      background: '#E2F3EE',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 10,
    }}>
      {/* game-icons:two-coins from task_ADS.svg Vector_2 */}
      <svg width="32" height="20" viewBox="227 630 120 28" fill="none">
        <path d="M238.894 631.454C237.225 631.451 235.135 631.979 233.072 633.052C231.013 634.126 229.381 635.532 228.423 636.905C227.464 638.274 227.205 639.549 227.676 640.458C228.148 641.363 229.342 641.883 231.015 641.883C232.688 641.888 234.778 641.36 236.841 640.291C238.9 639.218 240.532 637.812 241.49 636.439C242.449 635.07 242.708 633.795 242.237 632.886C241.765 631.98 240.571 631.46 238.894 631.454Z" fill={ACCENT}/>
        <path d="M236.891 641.946C235.003 642.869 233.188 643.306 231.717 643.219C232.625 644.046 233.891 644.5 235.338 644.5C237.011 644.505 239.101 643.977 241.164 642.908C243.223 641.835 244.855 640.429 245.813 639.056C246.519 638.039 246.733 637.038 246.437 636.19C246.107 637.249 245.105 638.362 243.546 639.36C241.793 640.473 239.466 641.252 236.891 641.946Z" fill={ACCENT} opacity="0.7"/>
      </svg>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#02020E' }}>Награда:</span>
      <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>
        {parseFloat(reward).toFixed(0)} ₽
      </span>
    </div>
  )
}

// ── Per-type step config ───────────────────────────────────────────────────────
const STEPS: Record<string, { step1: string; step2: string; btn1: string }> = {
  subscribe: {
    step1: 'Перейдите по ссылке и подпишитесь на канал.',
    step2: 'После подписки нажмите «Проверить».',
    btn1: 'Перейти на канал',
  },
  like: {
    step1: 'Перейдите по ссылке и поставьте лайк на пост.',
    step2: 'После лайка нажмите «Проверить».',
    btn1: 'Перейти к посту',
  },
  watch_ad: {
    step1: 'Просмотрите 2 рекламных видео',
    step2: 'После просмотра 2 рекламных видео нажмите на «Проверить» для проверки',
    btn1: 'Смотреть видео',
  },
  invite: {
    step1: 'Поделитесь реферальной ссылкой с другом',
    step2: 'Друг должен зарегистрироваться и выполнить 3 задания',
    btn1: 'Перейти',
  },
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tasks, updateTask } = useStore()
  const task = tasks.find((t) => t.id === Number(id))

  const [status, setStatus] = useState<UserTaskStatus | null>(task?.user_status ?? null)
  const [timeLeft, setTimeLeft]   = useState<number>(0)
  const [loading, setLoading]     = useState(false)
  const [adStarted, setAdStarted] = useState(false)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [expiresCountdown, setExpiresCountdown] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const adDuration = useRef<number>(0)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current)  clearInterval(pollRef.current)
  }, [])

  // Countdown from task's expires_at (for non-watch_ad in_progress tasks)
  useEffect(() => {
    if (!task?.expires_at) return
    const tick = () => {
      const diff = new Date(task.expires_at!).getTime() - Date.now()
      if (diff <= 0) { setExpiresCountdown('Истекает'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const fmt = (n: number) => String(n).padStart(2, '0')
      setExpiresCountdown(h > 0
        ? `Осталось: ${fmt(h)} ч ${fmt(m)} мин`
        : `Осталось: ${fmt(m)} мин:${fmt(s)} сек`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [task?.expires_at])

  useEffect(() => {
    if (task?.user_status == null) return
    if (task!.user_status !== 'checking') setStatus(task!.user_status)
  }, [task?.id, task?.user_status])

  useEffect(() => {
    if (!task) return
    tasksApi.getStatus(task.id).then(({ data }) => {
      if (data.user_status == null) return
      if (data.user_status !== 'checking') setStatus(data.user_status as UserTaskStatus)
    }).catch(() => {})
  }, [task?.id])

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
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [adStarted, task])

  useEffect(() => { if (status === 'checking') startPolling() }, [status])

  if (!task) { navigate('/tasks', { replace: true }); return null }

  const stepCfg = STEPS[task.task_type] || STEPS.subscribe

  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await tasksApi.getStatus(task.id)
        const st = data.user_status
        if (st && st !== 'checking') {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          setStatus(st as UserTaskStatus)
          updateTask({ ...task, user_status: st as UserTaskStatus, error_message: data.error_message ?? undefined })
          if (st === 'completed') {
            showToast(`+${parseFloat(task.reward).toFixed(0)}₽ начислено!`, 'success')
          } else if (st === 'failed' || st === 'expired') {
            const msg = data.error_message || 'Задание не выполнено'
            setErrorMsg(msg)
            showToast(msg, 'error')
          }
        }
      } catch {}
    }, 2000)
  }

  const handleStart = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const { data } = await tasksApi.start(task.id)
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
      if (task.task_type === 'watch_ad' && task.external_url) {
        window.open(task.external_url, '_blank')
      }
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err), 'error')
    } finally { setLoading(false) }
  }

  const handleCheck = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const { data } = await tasksApi.check(task.id)
      const st = data.status as UserTaskStatus
      setStatus(st)
      updateTask({ ...task, user_status: st, error_message: (st === 'failed' || st === 'expired') ? data.message : undefined })
      if (st === 'completed') {
        showToast(`+${parseFloat(task.reward).toFixed(0)}₽ начислено!`, 'success')
      } else if (st === 'failed' || st === 'expired') {
        setErrorMsg(data.message)
        showToast(data.message, 'error')
      }
      // st === 'checking' — для watch_ad/invite; подписка/лайк приходят сразу completed/failed
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err)
      setErrorMsg(msg)
      showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      if (task.user_task_id) {
        await tasksApi.cancel(task.id)
      }
      setStatus(null)
      setAdStarted(false)
      setTimeLeft(0)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      updateTask({ ...task, user_status: undefined as unknown as UserTaskStatus })
      showToast('Задание отменено', 'default')
    } catch {
      setStatus(null)
      updateTask({ ...task, user_status: undefined as unknown as UserTaskStatus })
    } finally { setLoading(false) }
  }

  const isDone     = status === 'completed'
  const isChecking = status === 'checking'
  const isProgress = status === 'in_progress'
  const canCheck   = isProgress && (task.task_type !== 'watch_ad' || (adStarted && timeLeft === 0))

  // Ad timer progress
  const adProgress = adDuration.current > 0
    ? Math.round(((adDuration.current - timeLeft) / adDuration.current) * 100)
    : 0

  return (
    // Dark overlay — centered dialog (task SVGs show popup floating centered)
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={() => navigate('/tasks')}
    >
      {/* Popup card — rect 343×auto rx=20 fill=#F5F5F5 stroke=#EEECF9 (from task SVGs) */}
      <div
        style={{
          background: '#F5F5F5',
          borderRadius: 20,
          border: '1px solid #EEECF9',
          width: '100%',
          maxWidth: 400,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(2,2,14,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header: close button top-right */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#02020E', lineHeight: 1.3, flex: 1 }}>
            {{ subscribe: 'Подписаться на канал', like: 'Поставить лайк на пост', watch_ad: 'Просмотр рекламы', invite: 'Пригласить друга' }[task.task_type] || task.title}
          </h1>
          <CloseBtn onClose={() => navigate('/tasks')} />
        </div>

        <div style={{ padding: '14px 16px 16px' }}>

          {/* ══════════════════════════════════════════════════════
              NOT STARTED — step-by-step instructions (SVG popap)
              ══════════════════════════════════════════════════════ */}
          {!status && !isDone && (
            <>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEECF9', padding: '14px 16px', marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <StepCircle n={1} />
                  <p style={{ fontSize: 14, color: '#02020E', lineHeight: 1.4, flex: 1, paddingTop: 5 }}>
                    {task.instruction ? task.instruction.split('\n')[0] || stepCfg.step1 : stepCfg.step1}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 32, marginBottom: 2 }}>
                <div style={{ width: 2, height: 10, background: '#EEECF9', borderRadius: 1 }}/>
              </div>
              <button
                onClick={handleStart}
                disabled={loading}
                style={{
                  width: '100%', height: 40, borderRadius: 20, border: 'none',
                  background: loading ? GREY : GRAD,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 6,
                }}
              >
                {loading
                  ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/>
                  : stepCfg.btn1}
              </button>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEECF9', padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <StepCircle n={2} />
                  <p style={{ fontSize: 14, color: '#02020E', lineHeight: 1.4, flex: 1, paddingTop: 5 }}>
                    {task.instruction ? task.instruction.split('\n')[1] || stepCfg.step2 : stepCfg.step2}
                  </p>
                </div>
              </div>
              <RewardBox reward={task.reward} />
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              IN PROGRESS / CHECKING — SVG card_9 layout
              (rect 342×197 white/stroke=#EEECF9 from tasks.svg)
              ══════════════════════════════════════════════════════ */}
          {(isProgress || isChecking) && !isDone && (
            <>
              {/* Reward row — balance group: coin icon + "Награда: X ₽" */}
              <RewardBox reward={task.reward} />
              <div style={{ height: 10 }} />

              {/* Timer row — task_19 group: material-symbols:timer + "00 мин:38 сек" */}
              {task.task_type === 'watch_ad' && adStarted && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 8, borderRadius: 4, background: '#EEECF9', overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', borderRadius: 4, background: GRAD, width: `${adProgress}%`, transition: 'width 1s linear' }}/>
                  </div>
                  {timeLeft > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.06-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill={ACCENT}/>
                      </svg>
                      <span style={{ fontSize: 13, color: '#4D536D', fontWeight: 600 }}>
                        Осталось: {String(Math.floor(timeLeft / 60)).padStart(2, '0')} мин:{String(timeLeft % 60).padStart(2, '0')} сек
                      </span>
                    </div>
                  )}
                </div>
              )}

              {task.task_type !== 'watch_ad' && expiresCountdown && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.06-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill={ACCENT}/>
                  </svg>
                  <span style={{ fontSize: 13, color: '#4D536D', fontWeight: 600 }}>{expiresCountdown}</span>
                </div>
              )}

              {/* Yellow warning box — task_20: fill=#FDF3CD + game-icons:sands-of-time */}
              <div style={{
                background: '#FDF3CD',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M6 2v6l4 4-4 4v6h12v-6l-4-4 4-4V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5-4-4V4h8v3.5l-4 4z" fill="#8B6200"/>
                </svg>
                <p style={{ fontSize: 12, color: '#8B6200', lineHeight: 1.4 }}>
                  {isChecking
                    ? 'Проверяем выполнение задания, подождите...'
                    : 'Задание выполняется, ожидайте проверки'}
                </p>
              </div>

              {/* Re-open link for subscribe/like */}
              {isProgress && task.external_url && task.task_type !== 'watch_ad' && (
                <button
                  onClick={() => window.open(task.external_url!, '_blank')}
                  style={{
                    width: '100%', height: 40, borderRadius: 20, border: 'none',
                    background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  {stepCfg.btn1}
                </button>
              )}

              {/* Check/verify — primary_button_4: rect rx=20 fill=#FA8D28 */}
              {isChecking ? (
                <button disabled style={{
                  width: '100%', height: 40, borderRadius: 20, border: 'none',
                  background: GREY, color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 8,
                }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/>
                  Проверяем
                </button>
              ) : canCheck ? (
                <button
                  onClick={handleCheck}
                  disabled={loading}
                  style={{
                    width: '100%', height: 40, borderRadius: 20, border: 'none',
                    background: loading ? GREY : ORANGE,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {loading
                    ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/>
                    : 'Проверить'}
                </button>
              ) : isProgress && task.task_type === 'watch_ad' && timeLeft > 0 ? (
                <button disabled style={{
                  width: '100%', height: 40, borderRadius: 20, border: 'none',
                  background: GREY, color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'default', opacity: 0.7, marginBottom: 8,
                }}>
                  Ждите {timeLeft}с…
                </button>
              ) : isProgress ? (
                <button
                  onClick={handleCheck}
                  disabled={loading}
                  style={{
                    width: '100%', height: 40, borderRadius: 20, border: 'none',
                    background: loading ? GREY : ORANGE,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {loading
                    ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/>
                    : 'Проверить'}
                </button>
              ) : null}

              {/* Кнопка отмены — всегда видна на этапе «В процессе» и «Проверка» */}
              {(isProgress || isChecking) && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  style={{
                    width: '100%', height: 42, borderRadius: 21,
                    background: 'transparent',
                    border: `2px solid ${ACCENT}`,
                    color: ACCENT, fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  Отменить задание
                </button>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              FAILED / EXPIRED — retry
              ══════════════════════════════════════════════════════ */}
          {(status === 'failed' || status === 'expired') && (
            <>
              <div style={{ background: '#FEE2E2', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>{errorMsg || 'Задание не выполнено'}</p>
              </div>
              <button
                onClick={() => { setErrorMsg(null); handleStart() }}
                disabled={loading}
                style={{
                  width: '100%', height: 40, borderRadius: 20, border: 'none',
                  background: loading ? GREY : GRAD,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 8,
                }}
              >
                {loading
                  ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/>
                  : 'Повторить попытку'}
              </button>
              <RewardBox reward={task.reward} />
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              COMPLETED
              ══════════════════════════════════════════════════════ */}
          {isDone && (
            <>
              <div style={{ background: '#E2F3EE', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#047935' }}>Задание выполнено!</p>
                <p style={{ fontSize: 13, color: ACCENT, marginTop: 4 }}>
                  +{parseFloat(task.reward).toFixed(0)}₽ начислено на баланс
                </p>
              </div>
              <button
                onClick={() => navigate('/tasks')}
                style={{
                  width: '100%', height: 40, borderRadius: 20, border: 'none',
                  background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', marginBottom: 8,
                }}
              >
                ← Вернуться к заданиям
              </button>
              <RewardBox reward={task.reward} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
