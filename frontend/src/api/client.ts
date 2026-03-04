import axios from 'axios'
import { useStore } from '../store'
import type { SortType, TransactionType } from '../types'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = useStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) useStore.getState().logout()
    return Promise.reject(err)
  },
)

export const authApi = {
  telegram: (initData: string, referralCode?: string, fingerprint?: string) =>
    api.post('/auth/telegram', {
      init_data: initData,
      referral_code: referralCode,
      device_fingerprint: fingerprint,
    }),
}

export const tasksApi = {
  list: (params?: { sort?: SortType; page?: number; page_size?: number }) =>
    api.get('/tasks', { params }),
  start: (taskId: number) => api.post(`/tasks/${taskId}/start`),
  check: (taskId: number) => api.post(`/tasks/${taskId}/check`),
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
  delete: () => api.delete('/profile'),
}

export const bonusesApi = {
  get: () => api.get('/bonuses'),
}

export const withdrawalsApi = {
  list: () => api.get('/withdrawals'),
  create: (data: { amount: number; method: string; requisites: string }) =>
    api.post('/withdrawals', data),
}

export default api
