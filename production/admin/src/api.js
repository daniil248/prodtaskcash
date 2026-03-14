import axios from 'axios';
// В проде: задайте VITE_API_URL (например https://your-backend.com), если админка и бэкенд на разных хостах.
// Иначе запросы идут на /api того же хоста — тогда прокси/сервер должен направлять /api на бэкенд.
const baseURL = import.meta.env.VITE_API_URL
    ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api`
    : '/api';
const api = axios.create({ baseURL });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use((r) => r, (err) => {
    if (err.response?.status === 403) {
        localStorage.removeItem('admin_token');
        window.location.href = '/';
    }
    return Promise.reject(err);
});
export default api;
export const adminApi = {
    login: (secret) => api.post('/admin/login', { secret }),
    stats: () => api.get('/admin/stats'),
    analytics: (days = 14) => api.get('/admin/analytics', { params: { days } }),
    users: (page = 1, search) => api.get('/admin/users', { params: { page, search } }),
    userDetail: (id) => api.get(`/admin/users/${id}`),
    updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
    banUser: (id, note) => api.post(`/admin/users/${id}/ban`, { note }),
    unbanUser: (id) => api.post(`/admin/users/${id}/unban`),
    adjustBalance: (id, amount, reason) => api.post(`/admin/users/${id}/balance`, { amount, reason }),
    broadcast: (formData) => api.post('/admin/broadcast', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    tasks: () => api.get('/admin/tasks'),
    createTask: (data) => api.post('/admin/tasks', data),
    updateTask: (id, data) => api.put(`/admin/tasks/${id}`, data),
    deleteTask: (id) => api.delete(`/admin/tasks/${id}`),
    withdrawals: (status, page = 1) => api.get('/admin/withdrawals', { params: { page, ...(status ? { status } : {}) } }),
    approveWithdrawal: (id, note) => api.post(`/admin/withdrawals/${id}/approve`, { note }),
    rejectWithdrawal: (id, note) => api.post(`/admin/withdrawals/${id}/reject`, { note }),
    blacklist: (page = 1) => api.get('/admin/blacklist', { params: { page } }),
    addToBlacklist: (data) => api.post('/admin/blacklist', data),
    removeFromBlacklist: (id) => api.delete(`/admin/blacklist/${id}`),
    getSettings: () => api.get('/admin/settings'),
    updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
};
