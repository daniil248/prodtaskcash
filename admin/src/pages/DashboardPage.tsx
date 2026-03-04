import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface Stats {
  total_users: number
  active_today: number
  tasks_completed_today: number
  total_paid_out: string
  pending_withdrawals: number
  pending_amount: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    adminApi.stats().then(({ data }) => setStats(data))
  }, [])

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="info-grid">
        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
            📊 Показатели
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
