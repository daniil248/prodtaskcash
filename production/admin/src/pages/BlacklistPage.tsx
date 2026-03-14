import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface BlacklistEntry {
  id: number
  telegram_id: number | null
  device_fingerprint: string | null
  ip_address: string | null
  reason: string
  created_at: string
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    telegram_id: '',
    device_fingerprint: '',
    ip_address: '',
    reason: '',
  })
  const [formError, setFormError] = useState('')

  const load = async (p: number) => {
    setLoading(true)
    try {
      const { data } = await adminApi.blacklist(p)
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  const handleAdd = async () => {
    if (!form.reason.trim()) {
      setFormError('Укажите причину')
      return
    }
    if (!form.telegram_id && !form.device_fingerprint && !form.ip_address) {
      setFormError('Укажите хотя бы одно: TG ID, fingerprint или IP')
      return
    }
    setFormError('')
    try {
      await adminApi.addToBlacklist({
        telegram_id: form.telegram_id ? parseInt(form.telegram_id) : null,
        device_fingerprint: form.device_fingerprint || null,
        ip_address: form.ip_address || null,
        reason: form.reason,
      })
      setForm({ telegram_id: '', device_fingerprint: '', ip_address: '', reason: '' })
      setShowForm(false)
      load(1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFormError(msg || 'Ошибка добавления')
    }
  }

  const handleRemove = async (id: number) => {
    if (!confirm('Удалить запись из чёрного списка?')) return
    await adminApi.removeFromBlacklist(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div>
      <div className="page-header">
        <h2>🚫 Чёрный список</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Добавить'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Добавить в чёрный список</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Telegram ID</label>
              <input
                className="input"
                type="number"
                placeholder="123456789"
                value={form.telegram_id}
                onChange={(e) => setForm((f) => ({ ...f, telegram_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">IP адрес</label>
              <input
                className="input"
                placeholder="1.2.3.4"
                value={form.ip_address}
                onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Device Fingerprint</label>
            <input
              className="input"
              placeholder="abc123..."
              value={form.device_fingerprint}
              onChange={(e) => setForm((f) => ({ ...f, device_fingerprint: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Причина *</label>
            <input
              className="input"
              placeholder="Мошенничество, мультиаккаунтинг..."
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          {formError && <p style={{ color: 'var(--red)', marginBottom: 10, fontSize: 13 }}>{formError}</p>}
          <button className="btn btn-primary" onClick={handleAdd}>
            Добавить в ЧС
          </button>
        </div>
      )}

      {loading ? (
        <div className="loader" />
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Чёрный список пуст
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Telegram ID</th>
                  <th>IP адрес</th>
                  <th>Fingerprint</th>
                  <th>Причина</th>
                  <th>Добавлен</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.telegram_id ?? '—'}</td>
                    <td>{e.ip_address ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {e.device_fingerprint ? `${e.device_fingerprint.slice(0, 16)}...` : '—'}
                    </td>
                    <td>{e.reason}</td>
                    <td>{new Date(e.created_at).toLocaleDateString('ru')}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(e.id)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="mobile-cards">
            {entries.map((e) => (
              <div key={e.id} className="mobile-card">
                <div className="mc-header">
                  <div>
                    <div className="mc-title" style={{ fontSize: 13, color: 'var(--red)' }}>🚫 Запись #{e.id}</div>
                    <div className="mc-sub">{new Date(e.created_at).toLocaleDateString('ru')}</div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemove(e.id)}
                  >
                    Удалить
                  </button>
                </div>
                {e.telegram_id && (
                  <div className="mc-row">
                    <span className="mc-label">Telegram ID</span>
                    <span className="mc-value">{e.telegram_id}</span>
                  </div>
                )}
                {e.ip_address && (
                  <div className="mc-row">
                    <span className="mc-label">IP адрес</span>
                    <span className="mc-value" style={{ fontFamily: 'monospace' }}>{e.ip_address}</span>
                  </div>
                )}
                {e.device_fingerprint && (
                  <div className="mc-row">
                    <span className="mc-label">Fingerprint</span>
                    <span className="mc-value" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {e.device_fingerprint.slice(0, 20)}...
                    </span>
                  </div>
                )}
                <div className="mc-row">
                  <span className="mc-label">Причина</span>
                  <span className="mc-value">{e.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {entries.length === 50 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => setPage((p) => p + 1)}>
            Загрузить ещё
          </button>
        </div>
      )}
    </div>
  )
}
