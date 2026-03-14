import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
const EMPTY_FORM = {
    title: '',
    description: '',
    instruction: '',
    task_type: 'subscribe',
    reward: '',
    icon_url: null,
    external_url: null,
    channel_id: null,
    post_id: null,
    duration_seconds: null,
    daily_limit: 1,
    total_user_limit: 1,
    max_completions: null,
    sort_order: 0,
    is_active: true,
    is_vip: false,
    expires_at: null,
    has_timer: false,
    timer_hours: null,
    is_simulation: false,
};
const TYPE_LABELS = {
    subscribe: '📢 Подписка',
    like: '👍 Лайк',
    watch_ad: '📺 Реклама',
    invite: '👥 Приглашение',
};
// Which fields are required/relevant per task type
const TYPE_HINTS = {
    subscribe: {
        fields: ['external_url', 'channel_id'],
        notes: 'Укажите ссылку на канал и @username или ID канала (для проверки подписки)',
    },
    like: {
        fields: ['external_url', 'channel_id'],
        notes: 'Ссылка на пост (ID поста возьмётся из неё), @username или ID канала для проверки',
    },
    watch_ad: {
        fields: ['external_url', 'duration_seconds'],
        notes: 'Укажите ссылку на видео/рекламу и минимальное время просмотра в секундах',
    },
    invite: {
        fields: [],
        notes: 'Задание выполняется когда пользователь приглашает реферала. Ссылка не нужна.',
    },
};
function formatDate(d) {
    if (!d)
        return '—';
    return new Date(d).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function toLocalDatetime(d) {
    if (!d)
        return '';
    const date = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export default function TasksAdminPage() {
    const [tasks, setTasks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const load = () => adminApi.tasks().then(({ data }) => setTasks(data));
    useEffect(() => { load(); }, []);
    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setError('');
        setShowModal(true);
    };
    const openEdit = (t) => {
        setEditing(t);
        setForm({
            title: t.title,
            description: t.description,
            instruction: t.instruction,
            task_type: t.task_type,
            reward: t.reward,
            icon_url: t.icon_url,
            external_url: t.external_url,
            channel_id: t.channel_id,
            post_id: t.post_id,
            duration_seconds: t.duration_seconds,
            daily_limit: t.daily_limit,
            total_user_limit: t.total_user_limit,
            max_completions: t.max_completions,
            sort_order: t.sort_order,
            is_active: t.is_active,
            is_vip: t.is_vip ?? false,
            expires_at: t.expires_at,
            has_timer: t.has_timer ?? false,
            timer_hours: t.timer_hours ?? null,
            is_simulation: t.is_simulation ?? false,
        });
        setError('');
        setShowModal(true);
    };
    const handleSave = async () => {
        if (!form.title.trim()) {
            setError('Название обязательно');
            return;
        }
        if (!form.reward || isNaN(parseFloat(String(form.reward)))) {
            setError('Укажите корректную награду');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                title: form.title.trim(),
                description: form.description || '',
                instruction: form.instruction || '',
                task_type: form.task_type,
                reward: parseFloat(String(form.reward)),
                icon_url: form.icon_url || null,
                external_url: form.external_url || null,
                channel_id: form.channel_id || null,
                post_id: form.post_id || null,
                duration_seconds: form.duration_seconds ? parseInt(String(form.duration_seconds)) : null,
                daily_limit: parseInt(String(form.daily_limit)) || 1,
                total_user_limit: parseInt(String(form.total_user_limit)) || 1,
                max_completions: form.max_completions ? parseInt(String(form.max_completions)) : null,
                sort_order: parseInt(String(form.sort_order)) || 0,
                is_active: form.is_active,
                is_vip: form.is_vip,
                expires_at: form.expires_at || null,
                has_timer: form.task_type === 'subscribe' ? !!form.has_timer : false,
                timer_hours: form.task_type === 'subscribe' && form.has_timer && form.timer_hours != null ? parseInt(String(form.timer_hours)) : null,
                is_simulation: form.task_type === 'subscribe' ? !!form.is_simulation : false,
            };
            if (editing) {
                await adminApi.updateTask(editing.id, payload);
            }
            else {
                await adminApi.createTask(payload);
            }
            setShowModal(false);
            load();
        }
        catch (e) {
            const msg = e?.response?.data?.detail;
            setError(msg || 'Ошибка сохранения');
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Удалить задание? Все записи пользователей по этому заданию тоже будут удалены. Это действие нельзя отменить.'))
            return;
        setDeleteError('');
        try {
            await adminApi.deleteTask(id);
            load();
        }
        catch (e) {
            const msg = e?.response?.data?.detail;
            setDeleteError(msg || 'Ошибка удаления задания');
        }
    };
    const toggleActive = async (t) => {
        try {
            await adminApi.updateTask(t.id, { ...t, is_active: !t.is_active });
            load();
        }
        catch {
            // ignore
        }
    };
    const hint = TYPE_HINTS[form.task_type] || TYPE_HINTS.subscribe;
    const budgetPct = (t) => t.max_completions ? Math.round((t.total_completions / t.max_completions) * 100) : null;
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { className: "page-title", style: { margin: 0 }, children: "\u0417\u0430\u0434\u0430\u043D\u0438\u044F" }), _jsx("button", { className: "btn btn-primary", onClick: openCreate, children: "+ \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435" })] }), deleteError && (_jsxs("div", { className: "alert alert-danger", style: { marginBottom: 16 }, children: [deleteError, _jsx("button", { style: { marginLeft: 12, cursor: 'pointer', background: 'none', border: 'none', fontWeight: 700 }, onClick: () => setDeleteError(''), children: "\u2715" })] })), _jsx("div", { className: "card desktop-table", style: { padding: 0, overflow: 'hidden' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("th", { children: "\u0422\u0438\u043F" }), _jsx("th", { children: "\u041D\u0430\u0433\u0440\u0430\u0434\u0430" }), _jsx("th", { children: "\u0411\u044E\u0434\u0436\u0435\u0442 / \u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" }), _jsx("th", { children: "\u0418\u0441\u0442\u0435\u043A\u0430\u0435\u0442" }), _jsx("th", { children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsxs("tbody", { children: [tasks.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, style: { textAlign: 'center', padding: 32, color: 'var(--text-muted)' }, children: "\u0417\u0430\u0434\u0430\u043D\u0438\u0439 \u043D\u0435\u0442. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u043E\u0435!" }) })), tasks.map((t) => {
                                    const pct = budgetPct(t);
                                    return (_jsxs("tr", { style: { opacity: t.is_active ? 1 : 0.6 }, children: [_jsx("td", { className: "text-muted text-sm", children: t.id }), _jsxs("td", { children: [_jsx("strong", { children: t.title }), t.channel_id && _jsx("div", { className: "text-sm text-muted", children: t.channel_id })] }), _jsx("td", { children: TYPE_LABELS[t.task_type] || t.task_type }), _jsxs("td", { style: { fontWeight: 700, color: 'var(--accent)' }, children: [parseFloat(t.reward).toFixed(0), "\u20BD"] }), _jsx("td", { children: _jsxs("div", { style: { minWidth: 130 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }, children: [_jsxs("span", { children: [t.total_completions, " / ", t.max_completions ?? '∞', " \u0447\u0435\u043B."] }), t.max_completions && (_jsxs("span", { className: "text-muted", title: "\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u0431\u044E\u0434\u0436\u0435\u0442\u0430", children: [((t.max_completions - t.total_completions) * parseFloat(t.reward)).toLocaleString('ru', { maximumFractionDigits: 0 }), " \u20BD"] }))] }), pct !== null && (_jsx("div", { style: { height: 5, background: '#EEECF9', borderRadius: 3, overflow: 'hidden' }, children: _jsx("div", { style: { height: '100%', width: `${pct}%`, background: pct >= 100 ? '#FE5A5B' : 'var(--accent)', borderRadius: 3 } }) })), t.max_completions && (_jsxs("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }, children: ["\u0411\u044E\u0434\u0436\u0435\u0442: ", (t.max_completions * parseFloat(t.reward)).toLocaleString('ru', { maximumFractionDigits: 0 }), " \u20BD"] }))] }) }), _jsx("td", { className: "text-sm", children: formatDate(t.expires_at) }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("span", { className: `badge ${t.is_active ? 'badge-green' : 'badge-gray'}`, style: { cursor: 'pointer' }, onClick: () => toggleActive(t), title: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F", children: t.is_active ? 'Активно' : 'Выключено' }), t.is_vip && (_jsx("span", { className: "badge", style: { background: '#FE5A5B', color: '#fff' }, children: "VIP" }))] }) }), _jsx("td", { children: _jsxs("div", { className: "flex gap-8", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => openEdit(t), children: "\u0420\u0435\u0434." }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => handleDelete(t.id), children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] }) })] }, t.id));
                                })] })] }) }), _jsxs("div", { className: "mobile-cards", children: [tasks.map((t) => {
                        const pct = budgetPct(t);
                        return (_jsxs("div", { className: "mobile-card", style: { opacity: t.is_active ? 1 : 0.65 }, children: [_jsxs("div", { className: "mc-header", children: [_jsxs("div", { children: [_jsx("div", { className: "mc-title", children: t.title }), _jsxs("div", { className: "mc-sub", children: [TYPE_LABELS[t.task_type] || t.task_type, " \u00B7 ID ", t.id] })] }), _jsx("span", { className: `badge ${t.is_active ? 'badge-green' : 'badge-gray'}`, style: { cursor: 'pointer', flexShrink: 0 }, onClick: () => toggleActive(t), children: t.is_active ? 'Вкл' : 'Выкл' })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u041D\u0430\u0433\u0440\u0430\u0434\u0430" }), _jsxs("span", { className: "mc-value", style: { fontWeight: 700, color: 'var(--accent)' }, children: [parseFloat(t.reward).toFixed(0), "\u20BD"] })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" }), _jsxs("span", { className: "mc-value", children: [t.total_completions, t.max_completions ? ` / ${t.max_completions}` : ' (без лимита)'] })] }), pct !== null && (_jsx("div", { style: { padding: '0 0 8px', marginTop: -4 }, children: _jsx("div", { style: { height: 5, background: '#EEECF9', borderRadius: 3, overflow: 'hidden' }, children: _jsx("div", { style: { height: '100%', width: `${pct}%`, background: pct >= 100 ? '#FE5A5B' : 'var(--accent)', borderRadius: 3 } }) }) })), t.expires_at && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0418\u0441\u0442\u0435\u043A\u0430\u0435\u0442" }), _jsx("span", { className: "mc-value", children: formatDate(t.expires_at) })] })), t.channel_id && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u041A\u0430\u043D\u0430\u043B" }), _jsx("span", { className: "mc-value", style: { fontSize: 12 }, children: t.channel_id })] })), _jsxs("div", { className: "mc-actions", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => openEdit(t), children: "\u270F\uFE0F \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => handleDelete(t.id), children: "\uD83D\uDDD1 \u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] })] }, t.id));
                    }), tasks.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' }, children: "\u0417\u0430\u0434\u0430\u043D\u0438\u0439 \u043D\u0435\u0442. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u043E\u0435!" }))] }), showModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowModal(false), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 560 }, children: [_jsx("h2", { className: "modal-title", children: editing ? 'Редактировать задание' : 'Новое задание' }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0422\u0438\u043F \u0437\u0430\u0434\u0430\u043D\u0438\u044F *" }), _jsxs("select", { value: form.task_type, onChange: (e) => setForm({ ...form, task_type: e.target.value }), style: { marginBottom: 0 }, children: [_jsx("option", { value: "subscribe", children: "\uD83D\uDCE2 \u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430 \u043D\u0430 \u043A\u0430\u043D\u0430\u043B" }), _jsx("option", { value: "like", children: "\uD83D\uDC4D \u041B\u0430\u0439\u043A / \u0420\u0435\u0430\u043A\u0446\u0438\u044F \u043D\u0430 \u043F\u043E\u0441\u0442" })] }), _jsxs("div", { style: {
                                        marginTop: 8, padding: '8px 12px', background: '#E2F3EE',
                                        borderRadius: 8, fontSize: 12, color: '#047935', lineHeight: 1.5,
                                    }, children: ["\u2139\uFE0F ", hint.notes] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx("input", { type: "text", placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041F\u043E\u0434\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u043A\u0430\u043D\u0430\u043B @taskcash", value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043A\u0440\u0430\u0442\u043A\u043E)" }), _jsx("input", { type: "text", placeholder: "\u041F\u043E\u0434\u043F\u0438\u0448\u0438\u0442\u0435\u0441\u044C \u043D\u0430 \u043D\u0430\u0448 \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u0430\u043D\u0430\u043B", value: form.description || '', onChange: (e) => setForm({ ...form, description: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsx("textarea", { rows: 3, placeholder: 'Шаг 1: Нажмите кнопку «Перейти»\nШаг 2: Подпишитесь на канал\nШаг 3: Нажмите «Проверить»', value: form.instruction || '', onChange: (e) => setForm({ ...form, instruction: e.target.value }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "\u041A\u0430\u0436\u0434\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430 = \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u0448\u0430\u0433. \u0415\u0441\u043B\u0438 \u043F\u0443\u0441\u0442\u043E \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0430\u044F \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F." })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041D\u0430\u0433\u0440\u0430\u0434\u0430 (\u20BD) *" }), _jsx("input", { type: "number", min: "1", step: "0.01", placeholder: "150", value: form.reward || '', onChange: (e) => setForm({ ...form, reward: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438" }), _jsx("input", { type: "number", placeholder: "0 = \u043F\u0435\u0440\u0432\u043E\u0435", value: form.sort_order, onChange: (e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 }) })] })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { className: "form-label", children: ["\u0421\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430 *", _jsx("span", { style: { color: '#FE5A5B' }, children: " (\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" })] }), _jsx("input", { type: "url", placeholder: form.task_type === 'like' ? 'https://t.me/channel/123 (ссылка на пост)' : 'https://t.me/yourchannel', value: form.external_url || '', onChange: (e) => setForm({ ...form, external_url: e.target.value || null }) }), form.task_type === 'like' && (_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043F\u043E\u0441\u0442 \u0432 \u043A\u0430\u043D\u0430\u043B\u0435 \u2014 ID \u043F\u043E\u0441\u0442\u0430 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u0438\u0437 \u043D\u0435\u0451 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438" }))] }), (form.task_type === 'subscribe' || form.task_type === 'like') && (_jsxs("div", { className: "form-group", children: [_jsxs("label", { className: "form-label", children: ["\u041A\u0430\u043D\u0430\u043B (username \u0438\u043B\u0438 \u0441\u0441\u044B\u043B\u043A\u0430) *", _jsx("span", { style: { color: '#FE5A5B' }, children: " \u2014 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438/\u043B\u0430\u0439\u043A\u0430" })] }), _jsx("input", { type: "text", placeholder: "gwwfwedw7777 \u0438\u043B\u0438 t.me/gwwfwedw7777 \u2014 \u043D\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u0430\u043D\u0430\u043B\u0430!", value: form.channel_id || '', onChange: (e) => setForm({ ...form, channel_id: e.target.value || null }) }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: ["\u0423\u043A\u0430\u0437\u044B\u0432\u0430\u0439\u0442\u0435 ", _jsx("strong", { children: "username" }), " \u043A\u0430\u043D\u0430\u043B\u0430 (\u0438\u0437 \u0441\u0441\u044B\u043B\u043A\u0438 t.me/username) \u0438\u043B\u0438 \u043F\u043E\u043B\u043D\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443. \u041D\u0435 \u0432\u0432\u043E\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u0430\u043D\u0430\u043B\u0430 \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435 \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442. \u0411\u043E\u0442 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u043E\u043C \u043A\u0430\u043D\u0430\u043B\u0430."] })] })), form.task_type === 'subscribe' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-group", children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: !!form.has_timer, onChange: (e) => setForm({ ...form, has_timer: e.target.checked, timer_hours: e.target.checked ? (form.timer_hours ?? 48) : null }), style: { width: 'auto', margin: 0 } }), _jsx("span", { className: "form-label", style: { marginBottom: 0 }, children: "\u0421 \u0442\u0430\u0439\u043C\u0435\u0440\u043E\u043C (\u0432\u0442\u043E\u0440\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0437\u0430 \u0447\u0430\u0441 \u0434\u043E \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F)" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "\u041F\u0440\u0438 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438: \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u0438 \u043D\u0430\u0436\u0430\u0442\u0438\u0438 \u00AB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C\u00BB, \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 (N\u22121) \u0447. \u0415\u0441\u043B\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0432\u0441\u0451 \u0435\u0449\u0451 \u0432 \u043A\u0430\u043D\u0430\u043B\u0435 \u2014 \u043D\u0430\u0447\u0438\u0441\u043B\u044F\u0435\u0442\u0441\u044F \u043D\u0430\u0433\u0440\u0430\u0434\u0430." })] }), form.has_timer && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0447\u0430\u0441\u043E\u0432" }), _jsx("input", { type: "number", min: 2, max: 720, placeholder: "48", value: form.timer_hours ?? '', onChange: (e) => setForm({ ...form, timer_hours: e.target.value ? parseInt(e.target.value) : null }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }, children: "\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 (\u044D\u0442\u043E \u0447\u0438\u0441\u043B\u043E \u2212 1) \u0447\u0430\u0441\u043E\u0432 \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u043E\u0439." })] })), _jsxs("div", { className: "form-group", children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: !!form.is_simulation, onChange: (e) => setForm({ ...form, is_simulation: e.target.checked }), style: { width: 'auto', margin: 0 } }), _jsx("span", { className: "form-label", style: { marginBottom: 0 }, children: "\u0418\u043C\u0438\u0442\u0430\u0446\u0438\u044F (\u0431\u043E\u0442 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442, \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u044B\u043F\u043B\u0430\u0442\u0430)" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435, \u0435\u0441\u043B\u0438 \u0431\u043E\u0442\u0430 \u043D\u0435\u0442 \u0432 \u0430\u0434\u043C\u0438\u043D\u0430\u0445 \u043A\u0430\u043D\u0430\u043B\u0430 \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430. \u041D\u0430\u0433\u0440\u0430\u0434\u0430 \u043D\u0430\u0447\u0438\u0441\u043B\u044F\u0435\u0442\u0441\u044F \u0431\u0435\u0437 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 (\u0441\u0440\u0430\u0437\u0443 \u0438\u043B\u0438 \u043F\u043E \u0442\u0430\u0439\u043C\u0435\u0440\u0443, \u0435\u0441\u043B\u0438 \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u00AB\u0421 \u0442\u0430\u0439\u043C\u0435\u0440\u043E\u043C\u00BB)." })] })] })), false && form.task_type === 'watch_ad' && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 (\u0441\u0435\u043A) *" }), _jsx("input", { type: "number", min: "5", placeholder: "30 \u0441\u0435\u043A\u0443\u043D\u0434", value: form.duration_seconds || '', onChange: (e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || null }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: "\u0415\u0441\u043B\u0438 \u0441\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u2014 \u0442\u0430\u0439\u043C\u0435\u0440 \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F" })] })), _jsxs("div", { style: { borderTop: '1px solid #EEECF9', paddingTop: 12, marginTop: 4 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }, children: "\u041B\u0438\u043C\u0438\u0442\u044B \u0438 \u0431\u044E\u0434\u0436\u0435\u0442" }), _jsxs("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }, children: ["\u041B\u0438\u043C\u0438\u0442\u044B \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A ", _jsx("strong", { children: "\u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E" }), ". \u0411\u044E\u0434\u0436\u0435\u0442 \u2014 \u043E\u0431\u0449\u0438\u0439 \u0441\u0447\u0451\u0442\u0447\u0438\u043A \u043F\u043E \u0432\u0441\u0435\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C."] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0420\u0430\u0437 \u0432 \u0434\u0435\u043D\u044C \u043D\u0430 1 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsx("input", { type: "number", min: "1", value: form.daily_limit, onChange: (e) => setForm({ ...form, daily_limit: parseInt(e.target.value) || 1 }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }, children: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437 \u0432 \u0441\u0443\u0442\u043A\u0438 \u043E\u0434\u0438\u043D \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043C\u043E\u0436\u0435\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u044D\u0442\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u0435" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0412\u0441\u0435\u0433\u043E \u0440\u0430\u0437 \u043D\u0430 1 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsx("input", { type: "number", min: "1", value: form.total_user_limit, onChange: (e) => setForm({ ...form, total_user_limit: parseInt(e.target.value) || 1 }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }, children: "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0439 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u043E\u0434\u043D\u0438\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C \u0437\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u0439 (\u043C\u0430\u043A\u0441.)" }), _jsx("input", { type: "number", min: "1", placeholder: "\u041F\u0443\u0441\u0442\u043E = \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439", value: form.max_completions || '', onChange: (e) => setForm({ ...form, max_completions: e.target.value ? parseInt(e.target.value) : null }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }, children: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u0432\u0441\u0435\u0433\u043E \u0441\u043C\u043E\u0433\u0443\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u044D\u0442\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u0435" })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { className: "form-label", children: ["\u0411\u044E\u0434\u0436\u0435\u0442 \u0437\u0430\u0434\u0430\u043D\u0438\u044F (\u20BD)", form.max_completions && form.reward && (_jsxs("span", { style: { fontSize: 11, color: 'var(--accent)', marginLeft: 6, fontWeight: 400 }, children: ["= ", form.max_completions, " \u00D7 ", parseFloat(String(form.reward)).toFixed(0), "\u20BD"] }))] }), _jsx("input", { type: "number", min: "1", placeholder: "\u0410\u0432\u0442\u043E-\u0440\u0430\u0441\u0447\u0451\u0442 \u0438\u0437 \u043A\u043E\u043B-\u0432\u0430 \u00D7 \u043D\u0430\u0433\u0440\u0430\u0434\u0430", value: form.max_completions && form.reward
                                                        ? Math.round(parseInt(String(form.max_completions)) * parseFloat(String(form.reward)))
                                                        : '', onChange: (e) => {
                                                        const budget = parseFloat(e.target.value);
                                                        const reward = parseFloat(String(form.reward));
                                                        if (!isNaN(budget) && reward > 0) {
                                                            setForm({ ...form, max_completions: Math.max(1, Math.floor(budget / reward)) });
                                                        }
                                                        else if (!e.target.value) {
                                                            setForm({ ...form, max_completions: null });
                                                        }
                                                    } }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }, children: "\u041E\u0431\u0449\u0430\u044F \u0441\u0443\u043C\u043C\u0430 \u0432\u044B\u043F\u043B\u0430\u0442 = \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0438 \u00D7 \u043D\u0430\u0433\u0440\u0430\u0434\u0430. \u041E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F \u0432 \u0431\u0430\u043D\u043D\u0435\u0440\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F" })] })] }), _jsxs("div", { className: "form-group", style: { marginTop: 4 }, children: [_jsx("label", { className: "form-label", children: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0437\u0430\u0434\u0430\u043D\u0438\u044F" }), _jsx("input", { type: "datetime-local", value: toLocalDatetime(form.expires_at), onChange: (e) => setForm({ ...form, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }) }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }, children: "\u041F\u043E\u0441\u043B\u0435 \u044D\u0442\u043E\u0439 \u0434\u0430\u0442\u044B \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435\u0442 \u0431\u044B\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u043C" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "URL \u0438\u043A\u043E\u043D\u043A\u0438 \u0437\u0430\u0434\u0430\u043D\u0438\u044F (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx("input", { type: "url", placeholder: "https://example.com/icon.png", value: form.icon_url || '', onChange: (e) => setForm({ ...form, icon_url: e.target.value || null }) })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: form.is_active, onChange: (e) => setForm({ ...form, is_active: e.target.checked }), style: { width: 'auto', margin: 0 } }), _jsx("span", { className: "form-label", style: { marginBottom: 0 }, children: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E (\u0432\u0438\u0434\u043D\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C)" })] }) }), _jsx("div", { className: "form-group", children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: form.is_vip, onChange: (e) => setForm({ ...form, is_vip: e.target.checked }), style: { width: 'auto', margin: 0 } }), _jsx("span", { className: "form-label", style: { marginBottom: 0 }, children: "\uD83D\uDD34 VIP \u0437\u0430\u0434\u0430\u043D\u0438\u0435 (\u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u0440\u0430\u0441\u043D\u044B\u0439 VIP-\u0437\u043D\u0430\u0447\u043E\u043A \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435)" })] }) }), error && (_jsx("div", { style: { background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: 8, marginBottom: 8, fontSize: 13 }, children: error })), _jsxs("div", { className: "flex gap-8", style: { marginTop: 8 }, children: [_jsx("button", { className: "btn btn-primary", style: { flex: 1 }, onClick: handleSave, disabled: saving, children: saving ? 'Сохранение…' : editing ? 'Сохранить изменения' : 'Создать задание' }), _jsx("button", { className: "btn btn-secondary", onClick: () => setShowModal(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) }))] }));
}
