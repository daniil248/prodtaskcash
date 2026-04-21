import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface UtmSource {
  id: number
  slug: string
  name: string
  description: string | null
  created_at: string
  link: string
  registrations: number
  active_registrations: number
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ru', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function UtmPage() {
  const [items, setItems] = useState<UtmSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.utmList()
      setItems(data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setName('')
    setDescription('')
    setError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('Название обязательно'); return }
    setSaving(true); setError('')
    try {
      await adminApi.utmCreate({ name: name.trim(), description: description.trim() || undefined })
      setShowModal(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Ошибка создания')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить UTM-ссылку «${name}»? Пользователи, пришедшие по ней, останутся, но в статистике источник пропадёт.`)) return
    try {
      await adminApi.utmDelete(id)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || 'Ошибка удаления')
    }
  }

  const copyLink = async (id: number, link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500)
    } catch {
      // fallback
      window.prompt('Скопируйте ссылку:', link)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>🔗 UTM-ссылки</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Создать ссылку</button>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
        Уникальные ссылки для отслеживания источников трафика. Раздайте ссылку (Facebook, Telegram-канал, партнёр и т.д.) — в таблице увидите, сколько человек зарегистрировалось по ней.
      </p>

      <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Комментарий</th>
              <th>Ссылка</th>
              <th style={{ textAlign: 'center' }}>Регистраций</th>
              <th style={{ textAlign: 'center' }}>Активных</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Загрузка…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                UTM-ссылок пока нет. Создайте первую!
              </td></tr>
            )}
            {items.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.description || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '4px 8px', borderRadius: 6, wordBreak: 'break-all' }}>
                      {u.link}
                    </code>
                    <button
                      onClick={() => copyLink(u.id, u.link)}
                      className="btn btn-secondary btn-sm"
                      style={{ flexShrink: 0 }}
                    >
                      {copied === u.id ? '✓' : '📋'}
                    </button>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                  {u.registrations}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {u.active_registrations}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards">
        {!loading && items.map((u) => (
          <div key={u.id} className="mobile-card">
            <div className="mc-header">
              <div>
                <div className="mc-title">{u.name}</div>
                <div className="mc-sub">{u.description || 'Без комментария'}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>🗑</button>
            </div>
            <div className="mc-row">
              <span className="mc-label">Регистраций</span>
              <span className="mc-value" style={{ fontWeight: 700, color: 'var(--accent)' }}>{u.registrations}</span>
            </div>
            <div className="mc-row">
              <span className="mc-label">Активных</span>
              <span className="mc-value">{u.active_registrations}</span>
            </div>
            <div style={{ padding: '8px 0 0', display: 'flex', gap: 6, alignItems: 'center' }}>
              <code style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '6px 8px', borderRadius: 6, wordBreak: 'break-all' }}>
                {u.link}
              </code>
              <button onClick={() => copyLink(u.id, u.link)} className="btn btn-secondary btn-sm">
                {copied === u.id ? '✓' : '📋'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h2 className="modal-title">Новая UTM-ссылка</h2>
            <div className="form-group">
              <label className="form-label">Название *</label>
              <input
                type="text"
                placeholder="Например: Facebook январь"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Отображается в таблице. Короткий ID ссылки сгенерируется автоматически.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Комментарий</label>
              <textarea
                rows={3}
                placeholder="Например: размещено в канале @mychannel, стоимость 500₽"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Отмена</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Создаём…' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
