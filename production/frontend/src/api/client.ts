import axios from 'axios'
import { useStore } from '../store'
import type { SortType, TransactionType, UserTaskStatus } from '../types'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = useStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => {
    const newToken = r.headers?.['x-new-access-token']
    if (newToken && typeof newToken === 'string') useStore.getState().setToken(newToken)
    return r
  },
  (err) => {
    // Only clear session on 401 from protected endpoints, NOT from /auth/telegram
    // (auth 401 means "bad initData", not "expired session")
    const url: string = err.config?.url ?? ''
    if (err.response?.status === 401 && !url.includes('/auth/')) {
      useStore.getState().logout()
    }
    return Promise.reject(err)
  },
)

/** Извлекает текст ошибки из ответа API (FastAPI: detail может быть строкой или массивом объектов). */
export function getApiErrorMessage(err: unknown): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length) {
    const first = d[0]
    return typeof first === 'object' && first !== null && 'msg' in first
      ? String((first as { msg?: string }).msg ?? first)
      : String(first)
  }
  return 'Ошибка сети или сервера'
}

export const authApi = {
  telegram: (initData: string, referralCode?: string, fingerprint?: string) =>
    api.post('/auth/telegram', {
      init_data: initData,
      referral_code: referralCode,
      device_fingerprint: fingerprint,
    }),
}

export const tasksApi = {
  list: (params?: { sort?: SortType; task_type?: string; page?: number; page_size?: number }) =>
    api.get('/tasks', { params }),
  start: (taskId: number) => api.post(`/tasks/${taskId}/start`),
  check: (taskId: number) =>
    api.post<{ status: UserTaskStatus; message: string }>(`/tasks/${taskId}/check`),
  cancel: (taskId: number) => api.post(`/tasks/${taskId}/cancel`),
  getStatus: (taskId: number) => api.get<{ user_status: UserTaskStatus | null; error_message: string | null }>(`/tasks/${taskId}/status`),
}

export interface NotificationSettings {
  notify_tasks: boolean
  notify_withdrawals: boolean
  notify_referrals: boolean
}

export const profileApi = {
  get: () => api.get('/profile'),
  transactions: (params?: {
    page?: number
    page_size?: number
    tx_type?: TransactionType | ''
    date_from?: string
    date_to?: string
  }) => api.get('/profile/transactions', { params }),
  getNotifications: () => api.get<NotificationSettings>('/profile/notifications'),
  updateNotifications: (data: Partial<NotificationSettings>) =>
    api.patch<NotificationSettings>('/profile/notifications', data),
  exportTransactions: (params?: { format?: string; date_from?: string; date_to?: string; tx_type?: string }) =>
    api.get('/profile/transactions/export', { params: params ?? { format: 'csv' }, responseType: 'blob' }),
  delete: () => api.delete('/profile'),
}

export const bonusesApi = {
  get: () => api.get('/bonuses'),
  incomeHistory: () => api.get('/bonuses/income-history'),
}

export const settingsApi = {
  public: () => api.get('/settings/public'),
  online: () => api.get('/settings/online'),
}

export const withdrawalsApi = {
  list: () => api.get('/withdrawals'),
  create: (data: { amount: number; method: string; requisites: string; full_name?: string }) =>
    api.post('/withdrawals', data),
}

export default api
