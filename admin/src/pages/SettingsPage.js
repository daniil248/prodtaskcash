import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
// Keys handled via custom UI — hidden from the generic list
const CUSTOM_KEYS = new Set(['banner_budget', 'banner_title', 'banner_task_id', 'banner_task_ids']);
const FRIENDLY_LABELS = {
    min_withdrawal: { label: 'Мин. сумма вывода (₽)', hint: 'Пользователь не сможет вывести меньше этой суммы' },
    max_withdrawal_day: { label: 'Макс. вывод в день (₽)', hint: 'Лимит на сумму всех выводов одного пользователя за сутки' },
    max_withdrawal_week: { label: 'Макс. вывод в неделю (₽)', hint: 'Лимит на сумму всех выводов одного пользователя за 7 дней' },
    withdrawal_fee_percent: { label: 'Комиссия за вывод (%)', hint: 'Процент, который вычитается из суммы вывода' },
    referral_reward: { label: 'Реферальный бонус (₽)', hint: 'Сколько получает реферер, когда реферал выполнит нужное кол-во заданий' },
    referral_min_tasks: { label: 'Заданий для выплаты реферала', hint: 'Реферал должен выполнить столько заданий, чтобы реферер получил бонус' },
    trust_soft_block: { label: 'Trust score для мягкой блокировки', hint: 'Пользователи ниже этого порога могут видеть ограниченный функционал' },
    welcome_message: { label: 'Приветственное сообщение бота', hint: 'Текст, который бот отправляет новым пользователям' },
};
export default function SettingsPage() {
    const [settings, setSettings] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});
    const [saved, setSaved] = useState({});
    const [loading, setLoading] = useState(true);
    // Multi-banner state: array of task IDs in order
    const [bannerIds, setBannerIds] = useState([]);
    const [bannerSaving, setBannerSaving] = useState(false);
    const [bannerSaved, setBannerSaved] = useState(false);
    const [bannerError, setBannerError] = useState('');
    const [addTaskId, setAddTaskId] = useState('');
    const [saveError, setSaveError] = useState(null);
    useEffect(() => {
        Promise.all([
            adminApi.getSettings(),
            adminApi.tasks(),
        ]).then(([settingsRes, tasksRes]) => {
            setSettings(settingsRes.data);
            setTasks(tasksRes.data);
            // Load banner_task_ids (JSON) — new multi-banner
            const multiSetting = settingsRes.data.find((s) => s.key === 'banner_task_ids');
            if (multiSetting && multiSetting.value) {
                try {
                    const ids = JSON.parse(multiSetting.value);
                    if (Array.isArray(ids)) {
                        setBannerIds(ids);
                        return;
                    }
                }
                catch { /* ignore */ }
            }
            // Fallback: legacy banner_task_id
            const singleSetting = settingsRes.data.find((s) => s.key === 'banner_task_id');
            if (singleSetting && singleSetting.value) {
                const id = parseInt(singleSetting.value);
                if (!isNaN(id))
                    setBannerIds([id]);
            }
        }).finally(() => setLoading(false));
    }, []);
    const handleChange = (key, val) => {
        setEditing((prev) => ({ ...prev, [key]: val }));
        setSaved((prev) => ({ ...prev, [key]: false }));
    };
    const handleSave = async (key) => {
        const value = editing[key];
        if (value === undefined)
            return;
        setSaveError(null);
        setSaving((prev) => ({ ...prev, [key]: true }));
        try {
            const { data } = await adminApi.updateSetting(key, String(value));
            setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value: data.value, updated_at: data.updated_at } : s)));
            setSaved((prev) => ({ ...prev, [key]: true }));
            setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
        }
        catch (e) {
            const msg = e?.response?.data?.detail ?? e?.message ?? 'Ошибка сохранения';
            setSaveError(`Не удалось сохранить «${key}»: ${msg}`);
        }
        finally {
            setSaving((prev) => ({ ...prev, [key]: false }));
        }
    };
    const saveBannerIds = async (ids) => {
        setBannerSaving(true);
        setBannerError('');
        try {
            await adminApi.updateSetting('banner_task_ids', JSON.stringify(ids));
            setBannerSaved(true);
            setTimeout(() => setBannerSaved(false), 2500);
        }
        catch (e) {
            const msg = e?.response?.data?.detail;
            setBannerError(msg || 'Ошибка сохранения баннеров');
        }
        finally {
            setBannerSaving(false);
        }
    };
    const handleAddBanner = () => {
        const id = parseInt(addTaskId);
        if (!isNaN(id) && !bannerIds.includes(id)) {
            const next = [...bannerIds, id];
            setBannerIds(next);
            setAddTaskId('');
            saveBannerIds(next);
        }
    };
    const handleRemoveBanner = (id) => {
        const next = bannerIds.filter((x) => x !== id);
        setBannerIds(next);
        saveBannerIds(next);
    };
    const handleMoveBanner = (fromIdx, toIdx) => {
        const next = [...bannerIds];
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        setBannerIds(next);
        saveBannerIds(next);
    };
    const getCurrentValue = (s) => editing[s.key] !== undefined ? editing[s.key] : s.value;
    const visibleSettings = settings.filter((s) => !CUSTOM_KEYS.has(s.key));
    if (loading)
        return _jsx("div", { className: "loader" });
    // Tasks that can be added (active, not already in list)
    const availableTasks = tasks.filter((t) => t.is_active && !bannerIds.includes(t.id));
    return (_jsxs("div", { children: [_jsx("div", { className: "page-header", children: _jsxs("div", { children: [_jsx("h2", { children: "\u2699\uFE0F \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }, children: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u043D\u0435\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E, \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430" })] }) }), _jsxs("div", { className: "card", style: { marginBottom: 20 }, children: [_jsx("div", { style: { padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700, fontSize: 15 }, children: "\uD83D\uDDBC\uFE0F \u041D\u043E\u0432\u043E\u0441\u0442\u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u0430 (\u0431\u0430\u043D\u043D\u0435\u0440\u044B)" }), _jsx("div", { style: { fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }, children: "\u0417\u0430\u0434\u0430\u043D\u0438\u044F, \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0437\u0434\u0435\u0441\u044C, \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432 \u043A\u0430\u0440\u0443\u0441\u0435\u043B\u0438 \u0431\u0430\u043D\u043D\u0435\u0440\u043E\u0432. \u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u043E\u0440\u044F\u0434\u043A\u0443 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435. \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0431\u044E\u0434\u0436\u0435\u0442 \u0438 \u0442\u0430\u0439\u043C\u0435\u0440 \u043F\u043E\u0434\u0442\u044F\u0433\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0438\u0437 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438." })] }), bannerSaved && (_jsx("span", { style: { color: 'var(--green)', fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 12 }, children: "\u2713 \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E" })), bannerSaving && (_jsx("span", { style: { color: 'var(--text-muted)', fontSize: 13, flexShrink: 0, marginLeft: 12 }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u043C..." })), bannerError && (_jsxs("span", { style: { color: '#B91C1C', fontSize: 13, flexShrink: 0, marginLeft: 12 }, children: ["\u26A0 ", bannerError] }))] }) }), _jsxs("div", { style: { padding: '16px 20px' }, children: [bannerIds.length === 0 && (_jsx("div", { style: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }, children: "\u0411\u0430\u043D\u043D\u0435\u0440\u044B \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u044B \u2014 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0441 \u0431\u044E\u0434\u0436\u0435\u0442\u043E\u043C/\u0442\u0430\u0439\u043C\u0435\u0440\u043E\u043C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438." })), bannerIds.map((id, idx) => {
                                const task = tasks.find((t) => t.id === id);
                                const budget = task?.max_completions && task?.reward
                                    ? (task.max_completions * parseFloat(task.reward)).toLocaleString('ru', { maximumFractionDigits: 0 })
                                    : null;
                                return (_jsxs("div", { style: {
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 12px', marginBottom: 8,
                                        background: 'linear-gradient(90deg,#1A44C2 0%,#00C7D3 100%)',
                                        borderRadius: 10, color: '#fff',
                                    }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [budget && (_jsxs("div", { style: { fontSize: 11, fontWeight: 800, color: '#FFD700', letterSpacing: 0.3, textTransform: 'uppercase' }, children: ["\u0411\u042E\u0414\u0416\u0415\u0422 ", budget, " \u20BD"] })), _jsx("div", { style: { fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: task ? task.title : `Задание #${id} (не найдено)` }), task?.expires_at && (_jsxs("div", { style: { fontSize: 11, opacity: 0.8, marginTop: 2 }, children: ["\u0422\u0430\u0439\u043C\u0435\u0440 \u0434\u043E ", new Date(task.expires_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })] })), !task?.expires_at && _jsx("div", { style: { fontSize: 11, opacity: 0.8, marginTop: 2 }, children: "\u0422\u0430\u0439\u043C\u0435\u0440: \u0431\u0435\u0437 \u0441\u0440\u043E\u043A\u0430 (\u221E)" })] }), _jsxs("div", { style: { display: 'flex', gap: 4, flexShrink: 0 }, children: [idx > 0 && (_jsx("button", { onClick: () => handleMoveBanner(idx, idx - 1), title: "\u0412\u0432\u0435\u0440\u0445", style: { background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 13 }, children: "\u2191" })), idx < bannerIds.length - 1 && (_jsx("button", { onClick: () => handleMoveBanner(idx, idx + 1), title: "\u0412\u043D\u0438\u0437", style: { background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 13 }, children: "\u2193" })), _jsx("button", { onClick: () => handleRemoveBanner(id), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0431\u0430\u043D\u043D\u0435\u0440\u043E\u0432", style: { background: 'rgba(255,100,100,0.3)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 13, fontWeight: 700 }, children: "\u2715" })] })] }, id));
                            }), _jsxs("div", { style: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }, children: [_jsxs("select", { value: addTaskId, onChange: (e) => setAddTaskId(e.target.value), style: { flex: 1, minWidth: 180, maxWidth: 360 }, children: [_jsx("option", { value: "", children: "\u2014 \u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u2014" }), availableTasks.map((t) => {
                                                const budget = t.max_completions
                                                    ? `${(t.max_completions * parseFloat(t.reward)).toLocaleString('ru', { maximumFractionDigits: 0 })} ₽`
                                                    : null;
                                                return (_jsxs("option", { value: String(t.id), children: ["[", t.id, "] ", t.title, budget ? ` — ${budget}` : '', t.expires_at ? ' ⏱' : ''] }, t.id));
                                            })] }), _jsx("button", { className: "btn btn-primary", onClick: handleAddBanner, disabled: !addTaskId || bannerSaving, style: { padding: '8px 20px', fontSize: 13 }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" })] }), _jsx("div", { style: { marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }, children: "\u23F1 \u2014 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0441 \u0442\u0430\u0439\u043C\u0435\u0440\u043E\u043C (expires_at \u0437\u0430\u0434\u0430\u043D) \u00A0|\u00A0 \u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 = \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0432 \u043A\u0430\u0440\u0443\u0441\u0435\u043B\u0438" })] })] }), _jsxs("div", { className: "card", children: [saveError && (_jsxs("div", { style: { padding: '12px 20px', marginBottom: 12, background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, fontSize: 13 }, children: [saveError, _jsx("button", { type: "button", onClick: () => setSaveError(null), style: { marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] })), visibleSettings.map((s, i) => {
                        const val = getCurrentValue(s);
                        const isDirty = editing[s.key] !== undefined && editing[s.key] !== s.value;
                        const isSaving = saving[s.key];
                        const isSaved = saved[s.key];
                        const meta = FRIENDLY_LABELS[s.key];
                        return (_jsxs("div", { children: [_jsx("div", { style: { padding: '16px 20px' }, children: _jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }, children: _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [meta ? (_jsx("span", { style: { fontWeight: 700, fontSize: 14 }, children: meta.label })) : (_jsx("code", { style: {
                                                                background: 'var(--bg)',
                                                                padding: '2px 8px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                color: 'var(--accent)',
                                                            }, children: s.key })), _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: ["\u00B7 ", new Date(s.updated_at).toLocaleDateString('ru')] })] }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }, children: meta?.hint || s.description }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [s.key === 'welcome_message' ? (_jsx("textarea", { className: "input", rows: 3, value: val, onChange: (e) => handleChange(s.key, e.target.value), style: { maxWidth: 400, resize: 'vertical' } })) : (_jsx("input", { className: "input", value: val, onChange: (e) => handleChange(s.key, e.target.value), style: { maxWidth: 280 } })), isDirty && (_jsx("button", { className: "btn btn-primary", onClick: () => handleSave(s.key), disabled: isSaving, style: { padding: '8px 16px', fontSize: 13 }, children: isSaving ? '...' : 'Сохранить' })), !isDirty && isSaved && (_jsx("span", { style: { color: 'var(--green)', fontSize: 13, fontWeight: 600 }, children: "\u2713 \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E" }))] })] }) }) }), i < visibleSettings.length - 1 && _jsx("div", { className: "divider" })] }, s.key));
                    }), visibleSettings.length === 0 && (_jsx("div", { style: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C \u0447\u0442\u043E \u043C\u0438\u0433\u0440\u0430\u0446\u0438\u044F 002 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0430 \u043A \u0442\u043E\u0439 \u0436\u0435 \u0411\u0414, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F \u0431\u044D\u043A\u0435\u043D\u0434." })), _jsx("p", { style: { marginTop: 16, padding: '0 20px 16px', fontSize: 12, color: 'var(--text-muted)' }, children: "\u041B\u0438\u043C\u0438\u0442\u044B \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0438 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438 \u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0438\u0437 \u0411\u0414 \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u0437\u0430\u043F\u0440\u043E\u0441\u0435. \u0415\u0441\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043D\u0435 \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u0430\u0434\u043C\u0438\u043D\u043A\u0430 \u0438 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0445\u043E\u0434\u044F\u0442 \u0432 \u043E\u0434\u0438\u043D \u0431\u044D\u043A\u0435\u043D\u0434 (\u043E\u0434\u0438\u043D DATABASE_URL)." })] })] }));
}
