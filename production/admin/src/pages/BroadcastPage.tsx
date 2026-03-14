import { useState } from 'react'
import { adminApi } from '../api'

const TYPES = [
  { value: 'text', label: 'Только текст' },
  { value: 'photo', label: 'Фото (JPEG, PNG, HEIC)' },
  { value: 'document', label: 'Документ (PDF, HEIC и др.)' },
  { value: 'video', label: 'Видео' },
  { value: 'animation', label: 'GIF' },
] as const

export default function BroadcastPage() {
  const [messageType, setMessageType] = useState<string>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (messageType !== 'text' && !file) {
      setResult('Для рассылки с медиа выберите файл.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('message_type', messageType)
      form.append('text', text)
      if (file) form.append('file', file)
      await adminApi.broadcast(form)
      setResult('Рассылка запущена. Сообщения отправляются всем пользователям пользовательского бота.')
      setText('')
      setFile(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Ошибка'
      setResult(`Ошибка: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">📢 Рассылка</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
        Отправка сообщения всем пользователям пользовательского бота. Поддерживаются: текст, JPEG/PNG/HEIC (фото), PDF/HEIC (документ), видео, GIF.
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 520 }}>
        <div className="form-group">
          <label className="form-label">Тип сообщения</label>
          <select
            value={messageType}
            onChange={(e) => { setMessageType(e.target.value); setFile(null) }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Текст (подпись к медиа или просто текст)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите текст сообщения..."
            rows={4}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical' }}
          />
        </div>

        {messageType !== 'text' && (
          <div className="form-group">
            <label className="form-label">Файл</label>
            <input
              type="file"
              accept={
                messageType === 'photo' ? 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic' :
                messageType === 'document' ? '.pdf,.heic,.heif,application/pdf,image/heic' :
                messageType === 'video' ? 'video/*' :
                'image/gif,.gif'
              }
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 14 }}
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Отправка...' : 'Запустить рассылку'}
        </button>

        {result && (
          <p style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 14 }}>
            {result}
          </p>
        )}
      </form>
    </div>
  )
}
