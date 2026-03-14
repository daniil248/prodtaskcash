import { useEffect, useState } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'default' | 'success' | 'error'
}

let addToastFn: ((msg: string, type?: ToastItem['type']) => void) | null = null

export const showToast = (message: string, type: ToastItem['type'] = 'default') => {
  addToastFn?.(message, type)
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    addToastFn = (message, type = 'default') => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
