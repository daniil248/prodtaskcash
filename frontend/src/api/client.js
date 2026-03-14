import axios from 'axios';
import { useStore } from '../store';
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
    const token = useStore.getState().token;
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use((r) => {
    const newToken = r.headers?.['x-new-access-token'];
    if (newToken && typeof newToken === 'string')
        useStore.getState().setToken(newToken);
    return r;
}, (err) => {
    // Only clear session on 401 from protected endpoints, NOT from /auth/telegram
    // (auth 401 means "bad initData", not "expired session")
    const url = err.config?.url ?? '';
    if (err.response?.status === 401 && !url.includes('/auth/')) {
        useStore.getState().logout();
    }
    return Promise.reject(err);
});
/** Извлекает текст ошибки из ответа API (FastAPI: detail может быть строкой или массивом объектов). */
export function getApiErrorMessage(err) {
    const d = err?.response?.data?.detail;
    if (typeof d === 'string')
        return d;
    if (Array.isArray(d) && d.length) {
        const first = d[0];
        return typeof first === 'object' && first !== null && 'msg' in first
            ? String(first.msg ?? first)
            : String(first);
    }
    return 'Ошибка сети или сервера';
}
export const authApi = {
    telegram: (initData, referralCode, fingerprint) => api.post('/auth/telegram', {
        init_data: initData,
        referral_code: referralCode,
        device_fingerprint: fingerprint,
    }),
};
export const tasksApi = {
    list: (params) => api.get('/tasks', { params }),
    start: (taskId) => api.post(`/tasks/${taskId}/start`),
    check: (taskId) => api.post(`/tasks/${taskId}/check`),
    cancel: (taskId) => api.post(`/tasks/${taskId}/cancel`),
    getStatus: (taskId) => api.get(`/tasks/${taskId}/status`),
};
export const profileApi = {
    get: () => api.get('/profile'),
    transactions: (params) => api.get('/profile/transactions', { params }),
    getNotifications: () => api.get('/profile/notifications'),
    updateNotifications: (data) => api.patch('/profile/notifications', data),
    exportTransactions: (params) => api.get('/profile/transactions/export', { params: params ?? { format: 'csv' }, responseType: 'blob' }),
    delete: () => api.delete('/profile'),
};
export const bonusesApi = {
    get: () => api.get('/bonuses'),
    incomeHistory: () => api.get('/bonuses/income-history'),
};
export const settingsApi = {
    public: () => api.get('/settings/public'),
    online: () => api.get('/settings/online'),
};
export const withdrawalsApi = {
    list: () => api.get('/withdrawals'),
    create: (data) => api.post('/withdrawals', data),
};
export default api;
