import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
export default function BlacklistPage() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        telegram_id: '',
        device_fingerprint: '',
        ip_address: '',
        reason: '',
    });
    const [formError, setFormError] = useState('');
    const load = async (p) => {
        setLoading(true);
        try {
            const { data } = await adminApi.blacklist(p);
            setEntries(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(page); }, [page]);
    const handleAdd = async () => {
        if (!form.reason.trim()) {
            setFormError('Укажите причину');
            return;
        }
        if (!form.telegram_id && !form.device_fingerprint && !form.ip_address) {
            setFormError('Укажите хотя бы одно: TG ID, fingerprint или IP');
            return;
        }
        setFormError('');
        try {
            await adminApi.addToBlacklist({
                telegram_id: form.telegram_id ? parseInt(form.telegram_id) : null,
                device_fingerprint: form.device_fingerprint || null,
                ip_address: form.ip_address || null,
                reason: form.reason,
            });
            setForm({ telegram_id: '', device_fingerprint: '', ip_address: '', reason: '' });
            setShowForm(false);
            load(1);
        }
        catch (err) {
            const msg = err?.response?.data?.detail;
            setFormError(msg || 'Ошибка добавления');
        }
    };
    const handleRemove = async (id) => {
        if (!confirm('Удалить запись из чёрного списка?'))
            return;
        await adminApi.removeFromBlacklist(id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: "\uD83D\uDEAB \u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A" }), _jsx("button", { className: "btn btn-primary", onClick: () => setShowForm(!showForm), children: showForm ? 'Отмена' : '+ Добавить' })] }), showForm && (_jsxs("div", { className: "card", style: { marginBottom: 20 }, children: [_jsx("h3", { style: { marginBottom: 16, fontSize: 15, fontWeight: 700 }, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0447\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Telegram ID" }), _jsx("input", { className: "input", type: "number", placeholder: "123456789", value: form.telegram_id, onChange: (e) => setForm((f) => ({ ...f, telegram_id: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "form-label", children: "IP \u0430\u0434\u0440\u0435\u0441" }), _jsx("input", { className: "input", placeholder: "1.2.3.4", value: form.ip_address, onChange: (e) => setForm((f) => ({ ...f, ip_address: e.target.value })) })] })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { className: "form-label", children: "Device Fingerprint" }), _jsx("input", { className: "input", placeholder: "abc123...", value: form.device_fingerprint, onChange: (e) => setForm((f) => ({ ...f, device_fingerprint: e.target.value })) })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { className: "form-label", children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 *" }), _jsx("input", { className: "input", placeholder: "\u041C\u043E\u0448\u0435\u043D\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u043C\u0443\u043B\u044C\u0442\u0438\u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0433...", value: form.reason, onChange: (e) => setForm((f) => ({ ...f, reason: e.target.value })) })] }), formError && _jsx("p", { style: { color: 'var(--red)', marginBottom: 10, fontSize: 13 }, children: formError }), _jsx("button", { className: "btn btn-primary", onClick: handleAdd, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0427\u0421" })] })), loading ? (_jsx("div", { className: "loader" })) : entries.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }, children: "\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "card desktop-table", style: { padding: 0, overflow: 'hidden' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Telegram ID" }), _jsx("th", { children: "IP \u0430\u0434\u0440\u0435\u0441" }), _jsx("th", { children: "Fingerprint" }), _jsx("th", { children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430" }), _jsx("th", { children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D" }), _jsx("th", {})] }) }), _jsx("tbody", { children: entries.map((e) => (_jsxs("tr", { children: [_jsx("td", { children: e.id }), _jsx("td", { children: e.telegram_id ?? '—' }), _jsx("td", { children: e.ip_address ?? '—' }), _jsx("td", { style: { fontFamily: 'monospace', fontSize: 11 }, children: e.device_fingerprint ? `${e.device_fingerprint.slice(0, 16)}...` : '—' }), _jsx("td", { children: e.reason }), _jsx("td", { children: new Date(e.created_at).toLocaleDateString('ru') }), _jsx("td", { children: _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => handleRemove(e.id), children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }) })] }, e.id))) })] }) }), _jsx("div", { className: "mobile-cards", children: entries.map((e) => (_jsxs("div", { className: "mobile-card", children: [_jsxs("div", { className: "mc-header", children: [_jsxs("div", { children: [_jsxs("div", { className: "mc-title", style: { fontSize: 13, color: 'var(--red)' }, children: ["\uD83D\uDEAB \u0417\u0430\u043F\u0438\u0441\u044C #", e.id] }), _jsx("div", { className: "mc-sub", children: new Date(e.created_at).toLocaleDateString('ru') })] }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => handleRemove(e.id), children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] }), e.telegram_id && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "Telegram ID" }), _jsx("span", { className: "mc-value", children: e.telegram_id })] })), e.ip_address && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "IP \u0430\u0434\u0440\u0435\u0441" }), _jsx("span", { className: "mc-value", style: { fontFamily: 'monospace' }, children: e.ip_address })] })), e.device_fingerprint && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "Fingerprint" }), _jsxs("span", { className: "mc-value", style: { fontFamily: 'monospace', fontSize: 11 }, children: [e.device_fingerprint.slice(0, 20), "..."] })] })), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430" }), _jsx("span", { className: "mc-value", children: e.reason })] })] }, e.id))) })] })), entries.length === 50 && (_jsx("div", { style: { textAlign: 'center', marginTop: 16 }, children: _jsx("button", { className: "btn btn-secondary", onClick: () => setPage((p) => p + 1), children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0435\u0449\u0451" }) }))] }));
}
