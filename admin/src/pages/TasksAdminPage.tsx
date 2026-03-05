import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface Task {
  id: number
  title: string
  description: string
  instruction: string
  task_type: string
  reward: string
  icon_url: string | null
  external_url: string | null
  channel_id: string | null
  post_id: string | null
  duration_seconds: number | null
  daily_limit: number
  total_user_limit: number
  max_completions: number | null
  total_completions: number
  sort_order: number
  is_active: boolean
  is_vip: boolean
  expires_at: string | null
  created_at: string | null
}

const EMPTY_FORM: Omit<Task, 'id' | 'total_completions' | 'created_at'> = {
  title: '',
  description: '',
  instruction: '',
  task_type: 'subscribe',
  reward: '',
  icon_url: null,
  external_url: null,
  channel_id: null,
  post_id: null,
  duration_seconds: null,
  daily_limit: 1,
  total_user_limit: 1,
  max_completions: null,
  sort_order: 0,
  is_active: true,
  is_vip: false,
  expires_at: null,
}

const TYPE_LABELS: Record<string, string> = {
  subscribe: '📢 Подписка',
  like:      '👍 Лайк',
  watch_ad:  '📺 Реклама',
  invite:    '👥 Приглашение',
}

// Which fields are required/relevant per task type
const TYPE_HINTS: Record<string, { fields: string[]; notes: string }> = {
  subscribe: {
    fields: ['external_url', 'channel_id'],
    notes: 'Укажите ссылку на канал и @username или ID канала (для проверки подписки)',
  },
  like: {
    fields: ['external_url', 'channel_id', 'post_id'],
    notes: 'Укажите ссылку на пост, @username канала и ID конкретного поста',
  },
  watch_ad: {
    fields: ['external_url', 'duration_seconds'],
    notes: 'Укажите ссылку на видео/рекламу и минимальное время просмотра в секундах',
  },
  invite: {
    fields: [],
    notes: 'Задание выполняется когда пользователь приглашает реферала. Ссылка не нужна.',
  },
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function toLocalDatetime(d: string | null) {
  if (!d) return ''
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TasksAdminPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => adminApi.tasks().then(({ data }) => setTasks(data))
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowModal(true)
  }

  const openEdit = (t: Task) => {
    setEditing(t)
    setForm({
      title:            t.title,
      description:      t.description,
      instruction:      t.instruction,
      task_type:        t.task_type,
      reward:           t.reward,
      icon_url:         t.icon_url,
      external_url:     t.external_url,
      channel_id:       t.channel_id,
      post_id:          t.post_id,
      duration_seconds: t.duration_seconds,
      daily_limit:      t.daily_limit,
      total_user_limit: t.total_user_limit,
      max_completions:  t.max_completions,
      sort_order:       t.sort_order,
      is_active:        t.is_active,
      is_vip:           t.is_vip ?? false,
      expires_at:       t.expires_at,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Название обязательно'); return }
    if (!form.reward || isNaN(parseFloat(String(form.reward)))) { setError('Укажите корректную награду'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        title:            form.title.trim(),
        description:      form.description || '',
        instruction:      form.instruction || '',
        task_type:        form.task_type,
        reward:           parseFloat(String(form.reward)),
        icon_url:         form.icon_url || null,
        external_url:     form.external_url || null,
        channel_id:       form.channel_id || null,
        post_id:          form.post_id || null,
        duration_seconds: form.duration_seconds ? parseInt(String(form.duration_seconds)) : null,
        daily_limit:      parseInt(String(form.daily_limit)) || 1,
        total_user_limit: parseInt(String(form.total_user_limit)) || 1,
        max_completions:  form.max_completions ? parseInt(String(form.max_completions)) : null,
        sort_order:       parseInt(String(form.sort_order)) || 0,
        is_active:        form.is_active,
        is_vip:           form.is_vip,
        expires_at:       form.expires_at || null,
      }
      if (editing) {
        await adminApi.updateTask(editing.id, payload)
      } else {
        await adminApi.createTask(payload)
      }
      setShowModal(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задание? Это действие нельзя отменить.')) return
    await adminApi.deleteTask(id)
    load()
  }

  const toggleActive = async (t: Task) => {
    await adminApi.updateTask(t.id, { ...t, is_active: !t.is_active })
    load()
  }

  const hint = TYPE_HINTS[form.task_type] || TYPE_HINTS.subscribe
  const budgetPct = (t: Task) => t.max_completions ? Math.round((t.total_completions / t.max_completions) * 100) : null

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Задания</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Создать задание</button>
      </div>

      {/* ── Desktop table ── */}
      <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Тип</th>
              <th>Награда</th>
              <th>Бюджет / Выполнено</th>
              <th>Истекает</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                Заданий нет. Создайте первое!
              </td></tr>
            )}
            {tasks.map((t) => {
              const pct = budgetPct(t)
              return (
                <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.6 }}>
                  <td className="text-muted text-sm">{t.id}</td>
                  <td>
                    <strong>{t.title}</strong>
                    {t.channel_id && <div className="text-sm text-muted">{t.channel_id}</div>}
                  </td>
                  <td>{TYPE_LABELS[t.task_type] || t.task_type}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{parseFloat(t.reward).toFixed(0)}₽</td>
                  <td>
                    <div style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span>{t.total_completions} выполн.</span>
                        <span className="text-muted">{t.max_completions ? `из ${t.max_completions}` : 'без лимита'}</span>
                      </div>
                      {pct !== null && (
                        <div style={{ height: 5, background: '#EEECF9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#FE5A5B' : 'var(--accent)', borderRadius: 3 }}/>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-sm">{formatDate(t.expires_at)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span
                        className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActive(t)}
                        title="Нажмите для переключения"
                      >
                        {t.is_active ? 'Активно' : 'Выключено'}
                      </span>
                      {t.is_vip && (
                        <span className="badge" style={{ background: '#FE5A5B', color: '#fff' }}>VIP</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Ред.</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="mobile-cards">
        {tasks.map((t) => {
          const pct = budgetPct(t)
          return (
            <div key={t.id} className="mobile-card" style={{ opacity: t.is_active ? 1 : 0.65 }}>
              <div className="mc-header">
                <div>
                  <div className="mc-title">{t.title}</div>
                  <div className="mc-sub">{TYPE_LABELS[t.task_type] || t.task_type} · ID {t.id}</div>
                </div>
                <span
                  className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => toggleActive(t)}
                >
                  {t.is_active ? 'Вкл' : 'Выкл'}
                </span>
              </div>
              <div className="mc-row">
                <span className="mc-label">Награда</span>
                <span className="mc-value" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {parseFloat(t.reward).toFixed(0)}₽
                </span>
              </div>
              <div className="mc-row">
                <span className="mc-label">Выполнено</span>
                <span className="mc-value">
                  {t.total_completions}
                  {t.max_completions ? ` / ${t.max_completions}` : ' (без лимита)'}
                </span>
              </div>
              {pct !== null && (
                <div style={{ padding: '0 0 8px', marginTop: -4 }}>
                  <div style={{ height: 5, background: '#EEECF9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#FE5A5B' : 'var(--accent)', borderRadius: 3 }}/>
                  </div>
                </div>
              )}
              {t.expires_at && (
                <div className="mc-row">
                  <span className="mc-label">Истекает</span>
                  <span className="mc-value">{formatDate(t.expires_at)}</span>
                </div>
              )}
              {t.channel_id && (
                <div className="mc-row">
                  <span className="mc-label">Канал</span>
                  <span className="mc-value" style={{ fontSize: 12 }}>{t.channel_id}</span>
                </div>
              )}
              <div className="mc-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>✏️ Редактировать</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>🗑 Удалить</button>
              </div>
            </div>
          )
        })}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Заданий нет. Создайте первое!
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2 className="modal-title">{editing ? 'Редактировать задание' : 'Новое задание'}</h2>

            {/* Task type selector FIRST — determines which fields are needed */}
            <div className="form-group">
              <label className="form-label">Тип задания *</label>
              <select
                value={form.task_type}
                onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                style={{ marginBottom: 0 }}
              >
                <option value="subscribe">📢 Подписка на канал</option>
                <option value="like">👍 Лайк / Реакция на пост</option>
                <option value="watch_ad">📺 Просмотр рекламы / видео</option>
                <option value="invite">👥 Приглашение друзей</option>
              </select>
              {/* Hint about required fields */}
              <div style={{
                marginTop: 8, padding: '8px 12px', background: '#E2F3EE',
                borderRadius: 8, fontSize: 12, color: '#047935', lineHeight: 1.5,
              }}>
                ℹ️ {hint.notes}
              </div>
            </div>

            {/* Required fields */}
            <div className="form-group">
              <label className="form-label">Название *</label>
              <input
                type="text"
                placeholder="Например: Подписаться на канал @taskcash"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Описание (кратко)</label>
              <input
                type="text"
                placeholder="Подпишитесь на наш официальный канал"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Инструкция для пользователя</label>
              <textarea
                rows={3}
                placeholder={'Шаг 1: Нажмите кнопку «Перейти»\nШаг 2: Подпишитесь на канал\nШаг 3: Нажмите «Проверить»'}
                value={form.instruction || ''}
                onChange={(e) => setForm({ ...form, instruction: e.target.value })}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Каждая строка = отдельный шаг. Если пусто — используется стандартная инструкция.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Награда (₽) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="150"
                  value={form.reward || ''}
                  onChange={(e) => setForm({ ...form, reward: e.target.value as unknown as string })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Порядок сортировки</label>
                <input
                  type="number"
                  placeholder="0 = первое"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* URL field (shown for all types except invite) */}
            {form.task_type !== 'invite' && (
              <div className="form-group">
                <label className="form-label">
                  Ссылка для перехода *
                  {hint.fields.includes('external_url') && <span style={{ color: '#FE5A5B' }}> (обязательно)</span>}
                </label>
                <input
                  type="url"
                  placeholder="https://t.me/yourchannel или ссылка на видео"
                  value={form.external_url || ''}
                  onChange={(e) => setForm({ ...form, external_url: e.target.value || null })}
                />
              </div>
            )}

            {/* Channel ID (for subscribe and like) */}
            {(form.task_type === 'subscribe' || form.task_type === 'like') && (
              <div className="form-group">
                <label className="form-label">
                  ID / @username канала *
                  <span style={{ color: '#FE5A5B' }}> (обязательно для проверки)</span>
                </label>
                <input
                  type="text"
                  placeholder="@yourchannel или -1001234567890"
                  value={form.channel_id || ''}
                  onChange={(e) => setForm({ ...form, channel_id: e.target.value || null })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Бот должен быть администратором канала для проверки подписок
                </div>
              </div>
            )}

            {/* Post ID (only for like) */}
            {form.task_type === 'like' && (
              <div className="form-group">
                <label className="form-label">
                  ID поста *
                  <span style={{ color: '#FE5A5B' }}> (обязательно для лайка)</span>
                </label>
                <input
                  type="text"
                  placeholder="123 (числовой ID поста в канале)"
                  value={form.post_id || ''}
                  onChange={(e) => setForm({ ...form, post_id: e.target.value || null })}
                />
              </div>
            )}

            {/* Duration (only for watch_ad) */}
            {form.task_type === 'watch_ad' && (
              <div className="form-group">
                <label className="form-label">
                  Минимальное время просмотра (сек) *
                  <span style={{ color: '#FE5A5B' }}> (обязательно)</span>
                </label>
                <input
                  type="number"
                  min="5"
                  placeholder="30 секунд"
                  value={form.duration_seconds || ''}
                  onChange={(e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || null })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Если свернуть приложение во время просмотра — таймер сбрасывается
                </div>
              </div>
            )}

            {/* Budget and limits */}
            <div style={{ borderTop: '1px solid #EEECF9', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Лимиты и бюджет
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Лимит в день / пользователь</label>
                  <input
                    type="number"
                    min="1"
                    value={form.daily_limit}
                    onChange={(e) => setForm({ ...form, daily_limit: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Всего выполнений / пользователь</label>
                  <input
                    type="number"
                    min="1"
                    value={form.total_user_limit}
                    onChange={(e) => setForm({ ...form, total_user_limit: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Бюджет (макс. выполнений всего)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Без лимита (оставьте пустым)"
                    value={form.max_completions || ''}
                    onChange={(e) => setForm({ ...form, max_completions: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Дата окончания задания</label>
                  <input
                    type="datetime-local"
                    value={toLocalDatetime(form.expires_at)}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </div>
              </div>
            </div>

            {/* Icon URL (optional) */}
            <div className="form-group">
              <label className="form-label">URL иконки задания (необязательно)</label>
              <input
                type="url"
                placeholder="https://example.com/icon.png"
                value={form.icon_url || ''}
                onChange={(e) => setForm({ ...form, icon_url: e.target.value || null })}
              />
            </div>

            {/* Active toggle */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span className="form-label" style={{ marginBottom: 0 }}>Задание активно (видно пользователям)</span>
              </label>
            </div>

            {/* VIP toggle */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_vip}
                  onChange={(e) => setForm({ ...form, is_vip: e.target.checked })}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span className="form-label" style={{ marginBottom: 0 }}>
                  🔴 VIP задание (показывать красный VIP-значок на карточке)
                </span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-8" style={{ marginTop: 8 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Сохранение…' : editing ? 'Сохранить изменения' : 'Создать задание'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
