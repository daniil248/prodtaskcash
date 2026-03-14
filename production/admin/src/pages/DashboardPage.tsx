import { useEffect, useState } from 'react'
import { adminApi } from '../api'

/** Форматирование даты для тултипа (DD.MM или DD.MM.YYYY) */
function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const y = d.getFullYear()
  return `${day}.${month.toString().padStart(2, '0')}.${y}`
}

interface Stats {
  total_users: number
  active_today: number
  tasks_completed_today: number
  total_paid_out: string
  pending_withdrawals: number
  pending_amount: string
}

interface DayData {
  date: string
  registrations: number
  completions: number
  payouts: number
}

// ── Mini SVG bar chart: столбец не меняет вид при наведении (нет дёргания), тултип в фиксированной зоне ────────────────────────────────────────────────────────
const TOOLTIP_ZONE_HEIGHT = 34

function BarChart({
  data,
  valueKey,
  color,
  formatValue,
  height = 80,
}: {
  data: DayData[]
  valueKey: keyof DayData
  color: string
  formatValue?: (v: number) => string
  height?: number
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const values = data.map((d) => d[valueKey] as number)
  const max = Math.max(...values, 1)
  const BAR_W = 16
  const GAP = 6
  const W = data.length * (BAR_W + GAP) - GAP
  const fmt = formatValue ?? ((v: number) => String(v))

  return (
    <div
      style={{ position: 'relative', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      onMouseLeave={() => setActiveIndex(null)}
      onScroll={() => setActiveIndex(null)}
    >
      {/* Фиксированная высота под тултип — layout не сдвигается при появлении/скрытии */}
      <div
        style={{
          minHeight: TOOLTIP_ZONE_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        {activeIndex !== null && data[activeIndex] !== undefined && (
          <div
            role="tooltip"
            style={{
              padding: '6px 10px',
              background: 'var(--text)',
              color: '#fff',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              width: 'fit-content',
            }}
          >
            {formatChartDate(data[activeIndex].date)} — {fmt(data[activeIndex][valueKey] as number)}
          </div>
        )}
      </div>
      <svg width={W} height={height + 8} style={{ display: 'block', minWidth: '100%' }}>
        {data.map((d, i) => {
          const v = d[valueKey] as number
          const barH = Math.max(3, (v / max) * height)
          const x = i * (BAR_W + GAP)
          const y = height - barH
          return (
            <g
              key={d.date}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(e) => {
                e.stopPropagation()
                setActiveIndex((prev) => (prev === i ? null : i))
              }}
            >
              {/* Столбец без смены стиля при hover — нет дёргания на десктопе и телефоне */}
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={4}
                fill={color}
                opacity={0.85}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Chart card ────────────────────────────────────────────────────────────────
function ChartCard({
  title,
  icon,
  total,
  totalLabel,
  data,
  valueKey,
  color,
  formatValue,
}: {
  title: string
  icon: string
  total: string
  totalLabel: string
  data: DayData[]
  valueKey: keyof DayData
  color: string
  formatValue?: (v: number) => string
}) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2, marginTop: 2 }}>
            {total}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalLabel}</div>
        </div>
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>
      <BarChart data={data} valueKey={valueKey} color={color} formatValue={formatValue} />
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<DayData[]>([])
  const [days, setDays] = useState(14)

  useEffect(() => {
    adminApi.stats().then(({ data }) => setStats(data))
  }, [])

  useEffect(() => {
    adminApi.analytics(days).then(({ data }) => setAnalytics(data))
  }, [days])

  if (!stats) return <div className="loader" />

  const hasPending = stats.pending_withdrawals > 0

  const CARDS = [
    {
      label: 'Всего пользователей',
      value: stats.total_users.toLocaleString('ru'),
      icon: '👤',
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      label: 'Активны сегодня',
      value: stats.active_today.toLocaleString('ru'),
      icon: '🟢',
      color: '#047935',
      bg: '#ECFDF5',
    },
    {
      label: 'Заданий сегодня',
      value: stats.tasks_completed_today.toLocaleString('ru'),
      icon: '✅',
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
    {
      label: 'Всего выплачено',
      value: `${parseFloat(stats.total_paid_out).toFixed(2)}₽`,
      icon: '💸',
      color: '#047935',
      bg: '#ECFDF5',
    },
    {
      label: 'Заявок на вывод',
      value: stats.pending_withdrawals.toLocaleString('ru'),
      icon: '⏳',
      color: hasPending ? '#8B6200' : 'var(--text-muted)',
      bg: hasPending ? '#FEF9C3' : 'var(--bg)',
      warn: hasPending,
    },
    {
      label: 'Сумма к выплате',
      value: `${parseFloat(stats.pending_amount).toFixed(2)}₽`,
      icon: '🏦',
      color: hasPending ? '#8B6200' : 'var(--text-muted)',
      bg: hasPending ? '#FEF9C3' : 'var(--bg)',
      warn: hasPending,
    },
  ]

  const totalRegs = analytics.reduce((s, d) => s + d.registrations, 0)
  const totalComps = analytics.reduce((s, d) => s + d.completions, 0)
  const totalPayouts = analytics.reduce((s, d) => s + d.payouts, 0)

  return (
    <div>
      <h1 className="page-title">Дашборд</h1>

      {hasPending && (
        <div style={{
          background: '#FEF9C3',
          border: '1px solid #FDE047',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          fontWeight: 600,
          color: '#713F12',
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span>
            Ожидает модерации: <strong>{stats.pending_withdrawals}</strong> заявок на вывод на сумму <strong>{parseFloat(stats.pending_amount).toFixed(2)}₽</strong>
          </span>
          <a href="/withdrawals" style={{ marginLeft: 'auto', color: '#8B6200', textDecoration: 'underline', fontSize: 13 }}>
            Перейти →
          </a>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        marginBottom: 24,
      }} className="stats-grid-override">
        {CARDS.map((c) => (
          <div
            key={c.label}
            style={{
              background: c.bg,
              border: c.warn ? '1px solid #FDE047' : '1px solid var(--border)',
              borderRadius: 14,
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1 }}>
              {c.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Analytics charts ── */}
      <div className="analytics-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>📊 Аналитика</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: `1.5px solid ${days === d ? 'var(--accent)' : 'var(--border)'}`,
                background: days === d ? 'var(--accent)' : 'transparent',
                color: days === d ? '#fff' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {d} дн.
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }} className="charts-grid">
        <ChartCard
          title="Новые пользователи"
          icon="👤"
          total={totalRegs.toLocaleString('ru')}
          totalLabel={`за ${days} дней`}
          data={analytics}
          valueKey="registrations"
          color="#2563EB"
        />
        <ChartCard
          title="Выполнено заданий"
          icon="✅"
          total={totalComps.toLocaleString('ru')}
          totalLabel={`за ${days} дней`}
          data={analytics}
          valueKey="completions"
          color="#7C3AED"
        />
        <ChartCard
          title="Выплачено"
          icon="💸"
          total={`${totalPayouts.toLocaleString('ru', { maximumFractionDigits: 0 })}₽`}
          totalLabel={`за ${days} дней`}
          data={analytics}
          valueKey="payouts"
          color="#047935"
          formatValue={(v) => v > 0 ? `${Math.round(v)}` : ''}
        />
      </div>

      {/* ── Info row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="info-grid">
        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
            📈 Показатели
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                label: 'Конверсия активных',
                value: stats.total_users > 0
                  ? `${Math.round((stats.active_today / stats.total_users) * 100)}%`
                  : '0%',
                desc: 'Активных сегодня от всех',
              },
              {
                label: 'Среднее заданий/польз.',
                value: stats.active_today > 0
                  ? (stats.tasks_completed_today / stats.active_today).toFixed(1)
                  : '0',
                desc: 'Заданий на активного пользователя',
              },
              {
                label: 'Прирост за период',
                value: totalRegs.toLocaleString('ru'),
                desc: `Новых за ${days} дней`,
              },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
            🔗 Быстрые действия
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/tasks', label: '+ Создать новое задание', icon: '✅' },
              { href: '/withdrawals', label: 'Проверить заявки на вывод', icon: '💸' },
              { href: '/users', label: 'Управление пользователями', icon: '👥' },
              { href: '/settings', label: 'Системные настройки', icon: '⚙️' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--bg)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'background 0.15s',
                }}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
