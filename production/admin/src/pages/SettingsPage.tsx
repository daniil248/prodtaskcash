import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface Setting {
  key: string
  value: string
  description: string
  updated_at: string
}

interface Task {
  id: number
  title: string
  is_active: boolean
  task_type: string
  reward: string
  max_completions: number | null
  total_completions: number
  expires_at: string | null
}

// Keys handled via custom UI — hidden from the generic list
const CUSTOM_KEYS = new Set(['banner_budget', 'banner_title', 'banner_task_id', 'banner_task_ids'])

const FRIENDLY_LABELS: Record<string, { label: string; hint: string }> = {
  min_withdrawal:       { label: 'Мин. сумма вывода (₽)', hint: 'Пользователь не сможет вывести меньше этой суммы' },
  max_withdrawal_day:   { label: 'Макс. вывод в день (₽)', hint: 'Лимит на сумму всех выводов одного пользователя за сутки' },
  max_withdrawal_week:  { label: 'Макс. вывод в неделю (₽)', hint: 'Лимит на сумму всех выводов одного пользователя за 7 дней' },
  withdrawal_fee_percent:{ label: 'Комиссия за вывод (%)', hint: 'Процент, который вычитается из суммы вывода' },
  referral_reward:      { label: 'Реферальный бонус (₽)', hint: 'Сколько получает реферер, когда реферал выполнит нужное кол-во заданий' },
  referral_min_tasks:   { label: 'Заданий для выплаты реферала', hint: 'Реферал должен выполнить столько заданий, чтобы реферер получил бонус' },
  trust_soft_block:     { label: 'Trust score для мягкой блокировки', hint: 'Пользователи ниже этого порога могут видеть ограниченный функционал' },
  welcome_message:      { label: 'Приветственное сообщение бота', hint: 'Текст, который бот отправляет новым пользователям' },
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Multi-banner state: array of task IDs in order
  const [bannerIds, setBannerIds] = useState<number[]>([])
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bannerSaved, setBannerSaved] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const [addTaskId, setAddTaskId] = useState<string>('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      adminApi.getSettings(),
      adminApi.tasks(),
    ]).then(([settingsRes, tasksRes]) => {
      setSettings(settingsRes.data)
      setTasks(tasksRes.data)
      // Load banner_task_ids (JSON) — new multi-banner
      const multiSetting = settingsRes.data.find((s: Setting) => s.key === 'banner_task_ids')
      if (multiSetting && multiSetting.value) {
        try {
          const ids: number[] = JSON.parse(multiSetting.value)
          if (Array.isArray(ids)) { setBannerIds(ids); return }
        } catch { /* ignore */ }
      }
      // Fallback: legacy banner_task_id
      const singleSetting = settingsRes.data.find((s: Setting) => s.key === 'banner_task_id')
      if (singleSetting && singleSetting.value) {
        const id = parseInt(singleSetting.value)
        if (!isNaN(id)) setBannerIds([id])
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, val: string) => {
    setEditing((prev) => ({ ...prev, [key]: val }))
    setSaved((prev) => ({ ...prev, [key]: false }))
  }

  const handleSave = async (key: string) => {
    const value = editing[key]
    if (value === undefined) return
    setSaveError(null)
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const { data } = await adminApi.updateSetting(key, String(value))
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: data.value, updated_at: data.updated_at } : s))
      )
      setSaved((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? (e as Error)?.message ?? 'Ошибка сохранения'
      setSaveError(`Не удалось сохранить «${key}»: ${msg}`)
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  const saveBannerIds = async (ids: number[]) => {
    setBannerSaving(true)
    setBannerError('')
    try {
      await adminApi.updateSetting('banner_task_ids', JSON.stringify(ids))
      setBannerSaved(true)
      setTimeout(() => setBannerSaved(false), 2500)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setBannerError(msg || 'Ошибка сохранения баннеров')
    } finally {
      setBannerSaving(false)
    }
  }

  const handleAddBanner = () => {
    const id = parseInt(addTaskId)
    if (!isNaN(id) && !bannerIds.includes(id)) {
      const next = [...bannerIds, id]
      setBannerIds(next)
      setAddTaskId('')
      saveBannerIds(next)
    }
  }

  const handleRemoveBanner = (id: number) => {
    const next = bannerIds.filter((x) => x !== id)
    setBannerIds(next)
    saveBannerIds(next)
  }

  const handleMoveBanner = (fromIdx: number, toIdx: number) => {
    const next = [...bannerIds]
    const [item] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, item)
    setBannerIds(next)
    saveBannerIds(next)
  }

  const getCurrentValue = (s: Setting) =>
    editing[s.key] !== undefined ? editing[s.key] : s.value

  const visibleSettings = settings.filter((s) => !CUSTOM_KEYS.has(s.key))

  if (loading) return <div className="loader" />

  // Tasks that can be added (active, not already in list)
  const availableTasks = tasks.filter((t) => t.is_active && !bannerIds.includes(t.id))

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>⚙️ Системные настройки</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Изменения применяются немедленно, без перезапуска
          </p>
        </div>
      </div>

      {/* ── Баннеры ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🖼️ Новости сервиса (баннеры)</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Задания, выбранные здесь, показываются в карусели баннеров. Порядок соответствует порядку в списке.
                Название, бюджет и таймер подтягиваются из задания автоматически.
              </div>
            </div>
            {bannerSaved && (
              <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>✓ Сохранено</span>
            )}
            {bannerSaving && (
              <span style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0, marginLeft: 12 }}>Сохраняем...</span>
            )}
            {bannerError && (
              <span style={{ color: '#B91C1C', fontSize: 13, flexShrink: 0, marginLeft: 12 }}>⚠ {bannerError}</span>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Current banner list */}
          {bannerIds.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
              Баннеры не выбраны — приложение покажет задания с бюджетом/таймером автоматически.
            </div>
          )}

          {bannerIds.map((id, idx) => {
            const task = tasks.find((t) => t.id === id)
            const budget = task?.max_completions && task?.reward
              ? (task.max_completions * parseFloat(task.reward)).toLocaleString('ru', { maximumFractionDigits: 0 })
              : null
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 8,
                background: 'linear-gradient(90deg,#1A44C2 0%,#00C7D3 100%)',
                borderRadius: 10, color: '#fff',
              }}>
                {/* Preview */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {budget && (
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      БЮДЖЕТ {budget} ₽
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task ? task.title : `Задание #${id} (не найдено)`}
                  </div>
                  {task?.expires_at && (
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                      Таймер до {new Date(task.expires_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {!task?.expires_at && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Таймер: без срока (∞)</div>}
                </div>

                {/* Position controls */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {idx > 0 && (
                    <button onClick={() => handleMoveBanner(idx, idx - 1)} title="Вверх" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>↑</button>
                  )}
                  {idx < bannerIds.length - 1 && (
                    <button onClick={() => handleMoveBanner(idx, idx + 1)} title="Вниз" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>↓</button>
                  )}
                  <button onClick={() => handleRemoveBanner(id)} title="Удалить из баннеров" style={{ background: 'rgba(255,100,100,0.3)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 13, fontWeight: 700 }}>✕</button>
                </div>
              </div>
            )
          })}

          {/* Add banner */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <select
              value={addTaskId}
              onChange={(e) => setAddTaskId(e.target.value)}
              style={{ flex: 1, minWidth: 180, maxWidth: 360 }}
            >
              <option value="">— Выбрать задание для добавления —</option>
              {availableTasks.map((t) => {
                const budget = t.max_completions
                  ? `${(t.max_completions * parseFloat(t.reward)).toLocaleString('ru', { maximumFractionDigits: 0 })} ₽`
                  : null
                return (
                  <option key={t.id} value={String(t.id)}>
                    [{t.id}] {t.title}{budget ? ` — ${budget}` : ''}{t.expires_at ? ' ⏱' : ''}
                  </option>
                )
              })}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleAddBanner}
              disabled={!addTaskId || bannerSaving}
              style={{ padding: '8px 20px', fontSize: 13 }}
            >
              + Добавить
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            ⏱ — задание с таймером (expires_at задан) &nbsp;|&nbsp; Порядок в списке = порядок в карусели
          </div>
        </div>
      </div>

      {/* ── Остальные настройки ── */}
      <div className="card">
        {saveError && (
          <div style={{ padding: '12px 20px', marginBottom: 12, background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, fontSize: 13 }}>
            {saveError}
            <button type="button" onClick={() => setSaveError(null)} style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Закрыть</button>
          </div>
        )}
        {visibleSettings.map((s, i) => {
          const val = getCurrentValue(s)
          const isDirty = editing[s.key] !== undefined && editing[s.key] !== s.value
          const isSaving = saving[s.key]
          const isSaved = saved[s.key]
          const meta = FRIENDLY_LABELS[s.key]

          return (
            <div key={s.key}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {meta ? (
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{meta.label}</span>
                      ) : (
                        <code style={{
                          background: 'var(--bg)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--accent)',
                        }}>
                          {s.key}
                        </code>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        · {new Date(s.updated_at).toLocaleDateString('ru')}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                      {meta?.hint || s.description}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {s.key === 'welcome_message' ? (
                        <textarea
                          className="input"
                          rows={3}
                          value={val}
                          onChange={(e) => handleChange(s.key, e.target.value)}
                          style={{ maxWidth: 400, resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          className="input"
                          value={val}
                          onChange={(e) => handleChange(s.key, e.target.value)}
                          style={{ maxWidth: 280 }}
                        />
                      )}
                      {isDirty && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleSave(s.key)}
                          disabled={isSaving}
                          style={{ padding: '8px 16px', fontSize: 13 }}
                        >
                          {isSaving ? '...' : 'Сохранить'}
                        </button>
                      )}
                      {!isDirty && isSaved && (
                        <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
                          ✓ Сохранено
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {i < visibleSettings.length - 1 && <div className="divider" />}
            </div>
          )
        })}

        {visibleSettings.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Настройки не найдены. Убедитесь что миграция 002 применена к той же БД, к которой подключается бэкенд.
          </div>
        )}
        <p style={{ marginTop: 16, padding: '0 20px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
          Лимиты выводов и комиссии читаются из БД при каждом запросе. Если изменения не применяются — проверьте, что админка и приложение ходят в один бэкенд (один DATABASE_URL).
        </p>
      </div>
    </div>
  )
}
