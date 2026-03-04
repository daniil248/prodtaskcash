import { useEffect, useState } from 'react'
import { adminApi } from '../api'

interface Setting {
  key: string
  value: string
  description: string
  updated_at: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getSettings().then(({ data }) => {
      setSettings(data)
    }).finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, val: string) => {
    setEditing((prev) => ({ ...prev, [key]: val }))
    setSaved((prev) => ({ ...prev, [key]: false }))
  }

  const handleSave = async (key: string) => {
    const value = editing[key]
    if (value === undefined) return
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const { data } = await adminApi.updateSetting(key, value)
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: data.value, updated_at: data.updated_at } : s))
      )
      setSaved((prev) => ({ ...prev, [key]: true }))
      // Сброс через 2 сек
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  const getCurrentValue = (s: Setting) =>
    editing[s.key] !== undefined ? editing[s.key] : s.value

  if (loading) return <div className="loader" />

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ Системные настройки</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Изменения применяются немедленно, без перезапуска
        </p>
      </div>

      <div className="card">
        {settings.map((s, i) => {
          const val = getCurrentValue(s)
          const isDirty = editing[s.key] !== undefined && editing[s.key] !== s.value
          const isSaving = saving[s.key]
          const isSaved = saved[s.key]

          return (
            <div key={s.key}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        обновлено {new Date(s.updated_at).toLocaleDateString('ru')}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                      {s.description}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input"
                        value={val}
                        onChange={(e) => handleChange(s.key, e.target.value)}
                        style={{ maxWidth: 280 }}
                      />
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
              {i < settings.length - 1 && <div className="divider" />}
            </div>
          )
        })}

        {settings.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Настройки не найдены. Убедитесь что миграция 002 применена.
          </div>
        )}
      </div>
    </div>
  )
}
