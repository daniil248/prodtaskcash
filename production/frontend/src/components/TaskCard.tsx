import type { Task } from '../types'

// SVG-extracted: exact brand gradient from components.svg
const GRAD = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)'

// Type icon paths from SVG (task_subscribtion.svg, task_like.svg, task_ADS.svg)
const TYPE_COLORS: Record<string, string> = {
  subscribe: '#1A44C2',
  like:      '#FE5A5B',
  watch_ad:  '#FA8D28',
  invite:    '#23C366',
}

const TYPE_LABELS: Record<string, string> = {
  subscribe: 'Подписка',
  like:      'Лайк',
  watch_ad:  'Реклама',
  invite:    'Приглашение',
}

// SVG icon paths extracted directly from task_subscribtion.svg / task_like.svg / task_ADS.svg
function TypeIcon({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || '#9B9FB0'
  if (type === 'subscribe') {
    // Telegram channel / subscribe icon
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#EDF5FF"/>
        <path d="M7 14.5L11.5 19L21 9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (type === 'like') {
    // Heart icon
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#FFEDED"/>
        <path d="M14 20s-7-4.35-7-8.5A4.5 4.5 0 0 1 14 9.1 4.5 4.5 0 0 1 21 11.5C21 15.65 14 20 14 20Z" fill={color}/>
      </svg>
    )
  }
  if (type === 'watch_ad') {
    // Play circle icon
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="14" fill="#FFF3E0"/>
        <path d="M11 10l9 4-9 4V10Z" fill={color}/>
      </svg>
    )
  }
  // invite
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#E2F3EE"/>
      <path d="M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 22v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M23 8v6M20 11h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'В процессе',
  checking:    'Проверка…',
  completed:   'Выполнено ✓',
  failed:      'Не выполнено',
  expired:     'Истекло',
}

interface Props {
  task: Task
  onClick: () => void
}

export default function TaskCard({ task, onClick }: Props) {
  const isDone     = task.user_status === 'completed'
  const isChecking = task.user_status === 'checking'
  const isActive   = task.user_status === 'in_progress'

  // Completion progress for the progress bar (0–100)
  const progress =
    task.max_completions && task.total_completions
      ? Math.min(100, (task.total_completions / task.max_completions) * 100)
      : 0

  return (
    <div
      onClick={isDone ? undefined : onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #EEECF9',
        marginBottom: 10,
        overflow: 'hidden',
        opacity: isDone ? 0.7 : 1,
        cursor: isDone ? 'default' : 'pointer',
        transition: 'transform 0.1s',
        boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
      }}
      onTouchStart={(e) => { if (!isDone) (e.currentTarget.style.transform = 'scale(0.985)') }}
      onTouchEnd={(e) => { (e.currentTarget.style.transform = 'scale(1)') }}
    >
      {/* Main row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 12px 10px',
        gap: 12,
        minHeight: 82,
      }}>

        {/* Thumbnail — 60×60, rx=12, white bg with icon */}
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          background: '#F8F8FA',
          border: '1px solid #EEECF9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {task.icon_url
            ? <img src={task.icon_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
            : <TypeIcon type={task.task_type} />
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type + status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: TYPE_COLORS[task.task_type] || '#9B9FB0',
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}>
              {TYPE_LABELS[task.task_type] || task.task_type}
            </span>
            {task.user_status && task.user_status !== 'completed' && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 100,
                background: isChecking ? '#FDF3CD' : isActive ? '#EDF5FF' : '#F8F8FA',
                color: isChecking ? '#8B6200' : isActive ? '#1A44C2' : '#9B9FB0',
              }}>
                {STATUS_LABELS[task.user_status]}
              </span>
            )}
            {isDone && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: '#E2F3EE', color: '#047935' }}>
                {STATUS_LABELS.completed}
              </span>
            )}
          </div>

          {/* Title */}
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#02020E',
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {task.title}
          </p>

          {/* Duration hint */}
          {task.duration_seconds && !isDone && (
            <p style={{ fontSize: 11, color: '#9B9FB0', marginTop: 3 }}>
              ⏱ {task.duration_seconds}с просмотра
            </p>
          )}
        </div>

        {/* CTA reward button — 112×40, rx=20, brand gradient (from SVG) */}
        <div style={{ flexShrink: 0 }}>
          {isDone ? (
            <div style={{
              width: 80,
              height: 36,
              borderRadius: 18,
              background: '#E2F3EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#047935',
            }}>
              ✓ Готово
            </div>
          ) : (
            <div style={{
              width: 94,
              height: 40,
              borderRadius: 20,
              background: GRAD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.2px',
            }}>
              +{parseFloat(task.reward).toFixed(0)}₽
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — full width, from SVG: 303×8, rx=4, #EEECF9 track */}
      {(progress > 0 || task.max_completions) && (
        <div style={{ padding: '0 12px 10px' }}>
          <div style={{ height: 6, borderRadius: 3, background: '#EEECF9', overflow: 'hidden' }}>
            {progress > 0 && (
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 3,
                background: GRAD,
                transition: 'width 0.3s',
              }} />
            )}
          </div>
          {task.max_completions && (
            <p style={{ fontSize: 10, color: '#9B9FB0', marginTop: 3, textAlign: 'right' }}>
              {task.total_completions ?? 0}/{task.max_completions} выполнений
            </p>
          )}
        </div>
      )}
    </div>
  )
}
