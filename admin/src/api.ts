import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 403) {
      localStorage.removeItem('admin_token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  },
)

export default api

export const adminApi = {
  login: (secret: string) => api.post('/admin/login', { secret }),
  stats: () => api.get('/admin/stats'),

  users: (page = 1, search?: string) =>
    api.get('/admin/users', { params: { page, search } }),
  userDetail: (id: number) => api.get(`/admin/users/${id}`),
  banUser: (id: number, note?: string) =>
    api.post(`/admin/users/${id}/ban`, { note }),
  unbanUser: (id: number) =>
    api.post(`/admin/users/${id}/unban`),
  adjustBalance: (id: number, amount: number, reason: string) =>
    api.post(`/admin/users/${id}/balance`, { amount, reason }),

  tasks: () => api.get('/admin/tasks'),
  createTask: (data: object) => api.post('/admin/tasks', data),
  updateTask: (id: number, data: object) => api.put(`/admin/tasks/${id}`, data),
  deleteTask: (id: number) => api.delete(`/admin/tasks/${id}`),

  withdrawals: (status?: string, page = 1) =>
    api.get('/admin/withdrawals', { params: { page, ...(status ? { status } : {}) } }),
  approveWithdrawal: (id: number, note?: string) =>
    api.post(`/admin/withdrawals/${id}/approve`, { note }),
  rejectWithdrawal: (id: number, note?: string) =>
    api.post(`/admin/withdrawals/${id}/reject`, { note }),

  blacklist: (page = 1) => api.get('/admin/blacklist', { params: { page } }),
  addToBlacklist: (data: {
    telegram_id?: number | null
    device_fingerprint?: string | null
    ip_address?: string | null
    reason: string
  }) => api.post('/admin/blacklist', data),
  removeFromBlacklist: (id: number) => api.delete(`/admin/blacklist/${id}`),

  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: string) =>
    api.put(`/admin/settings/${key}`, { value }),
}
