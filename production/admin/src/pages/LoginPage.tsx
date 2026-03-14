import { useState } from 'react'
import { adminApi } from '../api'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await adminApi.login(secret)
      localStorage.setItem('admin_token', data.access_token)
      onLogin()
    } catch {
      setError('Неверный секретный ключ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F5F5F5',
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#23C366', marginBottom: 8 }}>TaskCash</h1>
        <p style={{ color: '#9B9FB0', marginBottom: 28, fontSize: 14 }}>Панель администратора</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Секретный ключ</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Введите ADMIN_SECRET"
              autoFocus
            />
          </div>
          {error && <p style={{ color: '#FE5A5B', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
