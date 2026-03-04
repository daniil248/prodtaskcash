import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface AdminUser {
  id: number
  telegram_id: number
  first_name: string
  username: string | null
  balance: string
  total_earned: string
  trust_score: number
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

interface UserDetail {
  user: AdminUser
  transactions: Array<{ id: number; amount: number; tx_type: string; description: string; created_at: string }>
  completed_tasks: Array<{ task_id: number; task_title: string; reward: number; completed_at: string }>
  withdrawals: Array<{ id: number; amount: number; fee: number; method: string; status: string; created_at: string }>
}

function trustColor(score: number) {
  if (score < 35) return '#FE5A5B'
  if (score < 60) return '#F59E0B'
  return '#047935'
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [actionUser, setActionUser] = useState<AdminUser | null>(null)
  const [banNote, setBanNote] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [modal, setModal] = useState<'ban' | 'balance' | 'detail' | null>(null)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetail = async (u: AdminUser) => {
    setActionUser(u)
    setDetail(null)
    setModal('detail')
    setDetailLoading(true)
    try {
      const { data } = await adminApi.userDetail(u.id)
      setDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }

  const load = () =>
    adminApi.users(page, search || undefined).then(({ data }) => setUsers(data))

  useEffect(() => { load() }, [page, search])

  const handleBan = async () => {
    if (!actionUser) return
    await adminApi.banUser(actionUser.id, banNote)
    setModal(null)
    load()
  }

  const handleUnban = async (id: number) => {
    await adminApi.unbanUser(id)
    load()
  }

  const handleBalance = async () => {
    if (!actionUser || !adjAmount) return
    await adminApi.adjustBalance(actionUser.id, parseFloat(adjAmount), adjReason)
    setModal(null)
    setAdjAmount('')
    setAdjReason('')
    load()
  }

  return (
    <div>
      <h1 className="page-title">Пользователи</h1>

      <div className="search-bar">
        <input
          placeholder="Поиск по имени или @username"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <div className="flex gap-8" style={{ flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
          <span style={{ padding: '5px 8px', fontSize: 13, whiteSpace: 'nowrap' }}>стр. {page}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={users.length < 50}>→</button>
        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID / TG ID</th>
              <th>Пользователь</th>
              <th>Баланс</th>
              <th>Заработано</th>
              <th>Trust</th>
              <th>Статус</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="text-muted text-sm">{u.id} / {u.telegram_id}</td>
                <td>
                  <strong>{u.first_name}</strong>
                  {u.username && <span className="text-muted"> @{u.username}</span>}
                </td>
                <td>{parseFloat(u.balance).toFixed(2)}₽</td>
                <td>{parseFloat(u.total_earned).toFixed(2)}₽</td>
                <td>
                  <span style={{ color: trustColor(u.trust_score), fontWeight: 700 }}>
                    {u.trust_score}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.is_banned ? 'badge-red' : 'badge-green'}`}>
                    {u.is_banned ? 'Заблокирован' : 'Активен'}
                  </span>
                </td>
                <td className="text-muted text-sm">{new Date(u.created_at).toLocaleDateString('ru')}</td>
                <td>
                  <div className="flex gap-8">
                    <button className="btn btn-secondary btn-sm" onClick={() => openDetail(u)}>
                      Детали
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setActionUser(u); setAdjAmount(''); setModal('balance') }}
                    >
                      Баланс
                    </button>
                    {u.is_banned ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUnban(u.id)}>
                        Разблок.
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { setActionUser(u); setBanNote(''); setModal('ban') }}
                      >
                        Бан
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="mobile-cards">
        {users.map((u) => (
          <div key={u.id} className="mobile-card">
            <div className="mc-header">
              <div>
                <div className="mc-title">
                  {u.first_name}
                  {u.username && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}> @{u.username}</span>}
                </div>
                <div className="mc-sub">ID {u.id} · TG {u.telegram_id}</div>
              </div>
              <span className={`badge ${u.is_banned ? 'badge-red' : 'badge-green'}`}>
                {u.is_banned ? 'Бан' : 'Активен'}
              </span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Баланс</span>
              <span className="mc-value" style={{ fontWeight: 700 }}>{parseFloat(u.balance).toFixed(2)}₽</span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Заработано</span>
              <span className="mc-value">{parseFloat(u.total_earned).toFixed(2)}₽</span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Trust Score</span>
              <span className="mc-value" style={{ fontWeight: 700, color: trustColor(u.trust_score) }}>
                {u.trust_score}
              </span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Зарегистрирован</span>
              <span className="mc-value">{new Date(u.created_at).toLocaleDateString('ru')}</span>
            </div>
            {u.ban_reason && (
              <div className="mc-row">
                <span className="mc-label">Причина бана</span>
                <span className="mc-value" style={{ color: 'var(--red)', fontSize: 12 }}>{u.ban_reason}</span>
              </div>
            )}
            <div className="mc-actions" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => openDetail(u)}>
                🔍 Детали
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setActionUser(u); setAdjAmount(''); setModal('balance') }}
              >
                💰 Баланс
              </button>
              {u.is_banned ? (
                <button className="btn btn-secondary btn-sm" onClick={() => handleUnban(u.id)}>
                  ✅ Разблок.
                </button>
              ) : (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { setActionUser(u); setBanNote(''); setModal('ban') }}
                >
                  🚫 Заблок.
                </button>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Пользователей не найдено
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {modal === 'detail' && actionUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              🔍 {actionUser.first_name}
              {actionUser.username && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 15 }}> @{actionUser.username}</span>}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Баланс', value: `${parseFloat(actionUser.balance).toFixed(2)}₽` },
                { label: 'Заработано', value: `${parseFloat(actionUser.total_earned).toFixed(2)}₽` },
                { label: 'Trust Score', value: actionUser.trust_score, color: trustColor(actionUser.trust_score) },
                { label: 'Telegram ID', value: actionUser.telegram_id },
                { label: 'Статус', value: actionUser.is_banned ? '🚫 Заблокирован' : '✅ Активен' },
                { label: 'Зарегистрирован', value: new Date(actionUser.created_at).toLocaleDateString('ru') },
              ].map((s) => (
                <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: (s as { color?: string }).color || 'var(--text)' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {detailLoading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Загрузка...</div>}

            {detail && (
              <>
                {/* Completed tasks */}
                {detail.completed_tasks.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Выполненные задания ({detail.completed_tasks.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {detail.completed_tasks.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                          <span>{t.task_title}</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+{t.reward.toFixed(0)}₽</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Withdrawals */}
                {detail.withdrawals.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Заявки на вывод
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {detail.withdrawals.map((w) => (
                        <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                          <span>{w.amount.toFixed(2)}₽ · {w.method.toUpperCase()}</span>
                          <span className={`badge ${w.status === 'paid' ? 'badge-green' : w.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transactions */}
                {detail.transactions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      История транзакций
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {detail.transactions.map((t) => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t.description || t.tx_type}</span>
                          <span style={{ fontWeight: 600, color: t.amount >= 0 ? 'var(--accent)' : 'var(--red)', flexShrink: 0, marginLeft: 8 }}>
                            {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setModal(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ban modal ── */}
      {modal === 'ban' && actionUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">🚫 Заблокировать {actionUser.first_name}?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Баланс: {parseFloat(actionUser.balance).toFixed(2)}₽ · Trust: {actionUser.trust_score}
            </p>
            <div className="form-group">
              <label className="form-label">Причина блокировки</label>
              <input value={banNote} onChange={(e) => setBanNote(e.target.value)} placeholder="Мошенничество, накрутка..." />
            </div>
            <div className="flex gap-8">
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleBan}>Заблокировать</button>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance modal ── */}
      {modal === 'balance' && actionUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">💰 Корректировка баланса</h2>
            <p className="text-muted mb-16" style={{ fontSize: 13 }}>
              {actionUser.first_name} · Текущий баланс: <strong>{parseFloat(actionUser.balance).toFixed(2)}₽</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Сумма (отрицательная для списания)</label>
              <input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="100.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Причина корректировки</label>
              <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Ручная корректировка..." />
            </div>
            <div className="flex gap-8">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleBalance}>Применить</button>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
