import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface Withdrawal {
  id: number
  user_id: number
  amount: string
  fee: string
  method: string
  requisites: string
  status: string
  admin_note: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'created', label: 'Созданы' },
  { value: 'processing', label: 'Обрабатываются' },
  { value: 'security_check', label: 'Проверка безопасности' },
  { value: 'paid', label: 'Выплачены' },
  { value: 'rejected', label: 'Отклонены' },
]

const STATUS_BADGES: Record<string, string> = {
  created: 'badge-blue',
  processing: 'badge-yellow',
  security_check: 'badge-yellow',
  paid: 'badge-green',
  rejected: 'badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Создана',
  processing: 'Обработка',
  security_check: 'Проверка',
  paid: 'Выплачено',
  rejected: 'Отклонено',
}

const METHOD_LABELS: Record<string, string> = {
  card: '💳 Карта',
  sbp: '📱 СБП',
}

export default function WithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)

  const load = () =>
    adminApi.withdrawals(statusFilter || undefined).then(({ data }) => setItems(data))

  useEffect(() => { load() }, [statusFilter])

  const handleApprove = async () => {
    if (!actionId) return
    await adminApi.approveWithdrawal(actionId, note)
    setModal(null)
    setNote('')
    load()
  }

  const handleReject = async () => {
    if (!actionId) return
    await adminApi.rejectWithdrawal(actionId, note)
    setModal(null)
    setNote('')
    load()
  }

  const pending = items.filter((i) => i.status === 'created' || i.status === 'processing' || i.status === 'security_check')
  const pendingTotal = pending.reduce((s, i) => s + parseFloat(i.amount), 0)
  const canAct = (w: Withdrawal) => ['created', 'processing', 'security_check'].includes(w.status)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Выводы средств</h1>
        {pending.length > 0 && (
          <div style={{
            background: '#FDF3CD', borderRadius: 10, padding: '8px 14px',
            fontSize: 13, fontWeight: 600, color: '#8B6200', flexShrink: 0,
          }}>
            ⏳ {pending.length} · {pendingTotal.toFixed(2)}₽
          </div>
        )}
      </div>

      <div className="search-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Desktop table ── */}
      <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Сумма</th>
              <th>Комиссия</th>
              <th>Метод</th>
              <th>Реквизиты</th>
              <th>Статус</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id}>
                <td className="text-muted text-sm">{w.id}</td>
                <td className="text-muted text-sm">{w.user_id}</td>
                <td><strong>{parseFloat(w.amount).toFixed(2)}₽</strong></td>
                <td className="text-muted">{parseFloat(w.fee).toFixed(2)}₽</td>
                <td>{METHOD_LABELS[w.method] || w.method.toUpperCase()}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.requisites}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGES[w.status] || 'badge-gray'}`}>
                    {STATUS_LABELS[w.status] || w.status}
                  </span>
                </td>
                <td className="text-muted text-sm">{new Date(w.created_at).toLocaleDateString('ru')}</td>
                <td>
                  {canAct(w) && (
                    <div className="flex gap-8">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setActionId(w.id); setNote(''); setModal('approve') }}
                      >
                        ✓ Выплатить
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { setActionId(w.id); setNote(''); setModal('reject') }}
                      >
                        ✕ Откл.
                      </button>
                    </div>
                  )}
                  {w.admin_note && (
                    <p className="text-muted text-sm" style={{ marginTop: 4 }}>{w.admin_note}</p>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Заявок нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="mobile-cards">
        {items.map((w) => (
          <div key={w.id} className="mobile-card">
            <div className="mc-header">
              <div>
                <div className="mc-title">{parseFloat(w.amount).toFixed(2)}₽</div>
                <div className="mc-sub">
                  {METHOD_LABELS[w.method] || w.method} · User #{w.user_id}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGES[w.status] || 'badge-gray'}`}>
                {STATUS_LABELS[w.status] || w.status}
              </span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Реквизиты</span>
              <span className="mc-value" style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {w.requisites}
              </span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Комиссия</span>
              <span className="mc-value">{parseFloat(w.fee).toFixed(2)}₽</span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Дата заявки</span>
              <span className="mc-value">{new Date(w.created_at).toLocaleDateString('ru')}</span>
            </div>
            {w.admin_note && (
              <div className="mc-row">
                <span className="mc-label">Комментарий</span>
                <span className="mc-value text-muted" style={{ fontSize: 12 }}>{w.admin_note}</span>
              </div>
            )}
            {canAct(w) && (
              <div className="mc-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setActionId(w.id); setNote(''); setModal('approve') }}
                >
                  ✓ Выплатить
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { setActionId(w.id); setNote(''); setModal('reject') }}
                >
                  ✕ Отклонить
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Заявок нет
          </div>
        )}
      </div>

      {/* ── Action modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {modal === 'approve' ? '✓ Подтвердить выплату' : '✕ Отклонить заявку'}
            </h2>
            <div className="form-group">
              <label className="form-label">Комментарий для пользователя</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно..." />
            </div>
            <div className="flex gap-8">
              <button
                className={`btn ${modal === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                style={{ flex: 1 }}
                onClick={modal === 'approve' ? handleApprove : handleReject}
              >
                {modal === 'approve' ? 'Подтвердить выплату' : 'Отклонить заявку'}
              </button>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
