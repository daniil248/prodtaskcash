import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface Task {
  id: number
  title: string
  task_type: string
  reward: string
  is_active: boolean
  total_completions: number
  expires_at: string | null
}

const EMPTY_FORM = {
  title: '',
  description: '',
  instruction: '',
  task_type: 'subscribe',
  reward: '',
  external_url: '',
  channel_id: '',
  post_id: '',
  duration_seconds: '',
  daily_limit: '1',
  total_user_limit: '1',
  sort_order: '0',
  is_active: true,
  max_completions: '',
  expires_at: '',
}

const TYPE_LABELS: Record<string, string> = {
  subscribe: '📢 Подписка',
  like: '👍 Лайк',
  watch_ad: '📺 Реклама',
  invite: '👥 Приглашение',
}

export default function TasksAdminPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => adminApi.tasks().then(({ data }) => setTasks(data))
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (t: Task) => {
    setEditing(t)
    setForm({ ...EMPTY_FORM, ...(t as unknown as typeof EMPTY_FORM) })
    setShowModal(true)
  }

  const handleSave = async () => {
    const payload = {
      ...form,
      reward: parseFloat(form.reward),
      daily_limit: parseInt(form.daily_limit),
      total_user_limit: parseInt(form.total_user_limit),
      sort_order: parseInt(form.sort_order),
      duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
      max_completions: form.max_completions ? parseInt(form.max_completions) : null,
      expires_at: form.expires_at || null,
    }
    if (editing) {
      await adminApi.updateTask(editing.id, payload)
    } else {
      await adminApi.createTask(payload)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задание?')) return
    await adminApi.deleteTask(id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Задания</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Создать</button>
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
              <th>Выполнено</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td className="text-muted text-sm">{t.id}</td>
                <td><strong>{t.title}</strong></td>
                <td>{TYPE_LABELS[t.task_type] || t.task_type}</td>
                <td>{parseFloat(t.reward).toFixed(0)}₽</td>
                <td>{t.total_completions}</td>
                <td>
                  <span className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {t.is_active ? 'Активно' : 'Неактивно'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-8">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Ред.</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="mobile-cards">
        {tasks.map((t) => (
          <div key={t.id} className="mobile-card">
            <div className="mc-header">
              <div>
                <div className="mc-title">{t.title}</div>
                <div className="mc-sub">{TYPE_LABELS[t.task_type] || t.task_type} · ID {t.id}</div>
              </div>
              <span className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}>
                {t.is_active ? 'Активно' : 'Нет'}
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
              <span className="mc-value">{t.total_completions} раз</span>
            </div>
            {t.expires_at && (
              <div className="mc-row">
                <span className="mc-label">Истекает</span>
                <span className="mc-value">{new Date(t.expires_at).toLocaleDateString('ru')}</span>
              </div>
            )}
            <div className="mc-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>✏️ Редактировать</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>🗑 Удалить</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Заданий нет. Создайте первое!
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editing ? 'Редактировать задание' : 'Новое задание'}</h2>
            {([
              ['title', 'Название *', 'text'],
              ['description', 'Описание', 'text'],
              ['instruction', 'Инструкция для пользователя', 'textarea'],
              ['reward', 'Награда (₽) *', 'number'],
              ['external_url', 'Ссылка (куда перейти)', 'text'],
              ['channel_id', 'ID канала (для подписки/лайка)', 'text'],
              ['post_id', 'ID поста (для лайка)', 'text'],
              ['duration_seconds', 'Длительность просмотра (сек)', 'number'],
              ['daily_limit', 'Лимит в день на пользователя', 'number'],
              ['total_user_limit', 'Всего выполнений на пользователя', 'number'],
              ['max_completions', 'Макс. выполнений всего (0 = без лимита)', 'number'],
              ['sort_order', 'Порядок сортировки', 'number'],
              ['expires_at', 'Дата истечения задания', 'datetime-local'],
            ] as [string, string, string][]).map(([key, label, type]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={(form as unknown as Record<string, string>)[key] || ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : (
                  <input
                    type={type}
                    value={(form as unknown as Record<string, string>)[key] || ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Тип задания *</label>
              <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
                <option value="subscribe">📢 Подписка на канал</option>
                <option value="like">👍 Лайк/Реакция</option>
                <option value="watch_ad">📺 Просмотр рекламы</option>
                <option value="invite">👥 Приглашение друзей</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                <span className="form-label" style={{ marginBottom: 0 }}>Активно (видно пользователям)</span>
              </label>
            </div>

            <div className="flex gap-8" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                {editing ? 'Сохранить' : 'Создать'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
