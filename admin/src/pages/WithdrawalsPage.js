import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'created', label: 'Созданы' },
    { value: 'processing', label: 'Обрабатываются' },
    { value: 'security_check', label: 'Проверка безопасности' },
    { value: 'paid', label: 'Выплачены' },
    { value: 'rejected', label: 'Отклонены' },
];
const STATUS_BADGES = {
    created: 'badge-blue',
    processing: 'badge-yellow',
    security_check: 'badge-yellow',
    paid: 'badge-green',
    rejected: 'badge-red',
};
const STATUS_LABELS = {
    created: 'Создана',
    processing: 'Обработка',
    security_check: 'Проверка',
    paid: 'Выплачено',
    rejected: 'Отклонено',
};
const METHOD_LABELS = {
    card: '💳 Карта',
    sbp: '📱 СБП',
};
function userDisplayName(w) {
    const first = w.user_first_name || '';
    const last = (w.user_last_name || '').trim();
    const name = [first, last].filter(Boolean).join(' ') || 'Пользователь';
    const un = w.user_username ? ` @${w.user_username}` : '';
    return `${name}${un}`;
}
export default function WithdrawalsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [actionId, setActionId] = useState(null);
    const [note, setNote] = useState('');
    const [modal, setModal] = useState(null);
    const load = () => adminApi.withdrawals(statusFilter || undefined).then(({ data }) => setItems(data));
    useEffect(() => { load(); }, [statusFilter]);
    const handleApprove = async () => {
        if (!actionId)
            return;
        await adminApi.approveWithdrawal(actionId, note);
        setModal(null);
        setNote('');
        load();
    };
    const handleReject = async () => {
        if (!actionId)
            return;
        await adminApi.rejectWithdrawal(actionId, note);
        setModal(null);
        setNote('');
        load();
    };
    const pending = items.filter((i) => i.status === 'created' || i.status === 'processing' || i.status === 'security_check');
    const pendingTotal = pending.reduce((s, i) => s + parseFloat(i.amount), 0);
    const canAct = (w) => ['created', 'processing', 'security_check'].includes(w.status);
    return (_jsxs("div", { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { className: "page-title", style: { margin: 0 }, children: "\u0412\u044B\u0432\u043E\u0434\u044B \u0441\u0440\u0435\u0434\u0441\u0442\u0432" }), pending.length > 0 && (_jsxs("div", { style: {
                            background: '#FDF3CD', borderRadius: 10, padding: '8px 14px',
                            fontSize: 13, fontWeight: 600, color: '#8B6200', flexShrink: 0,
                        }, children: ["\u23F3 ", pending.length, " \u00B7 ", pendingTotal.toFixed(2), "\u20BD"] }))] }), _jsx("div", { className: "search-bar", children: _jsx("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), style: { maxWidth: 220 }, children: STATUS_OPTIONS.map((o) => _jsx("option", { value: o.value, children: o.label }, o.value)) }) }), _jsx("div", { className: "card desktop-table", style: { padding: 0, overflow: 'hidden' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }), _jsx("th", { children: "\u0421\u0443\u043C\u043C\u0430" }), _jsx("th", { children: "\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F" }), _jsx("th", { children: "\u041C\u0435\u0442\u043E\u0434" }), _jsx("th", { children: "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B" }), _jsx("th", { children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("th", { children: "\u0414\u0430\u0442\u0430" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsxs("tbody", { children: [items.map((w) => (_jsxs("tr", { children: [_jsx("td", { className: "text-muted text-sm", children: w.id }), _jsxs("td", { children: [_jsx("button", { type: "button", className: "btn-link", onClick: () => navigate('/users', { state: { openUserId: w.user_id } }), style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', textAlign: 'left' }, children: userDisplayName(w) }), _jsxs("div", { className: "text-muted text-sm", children: ["ID ", w.user_id, w.user_telegram_id != null ? ` · TG ${w.user_telegram_id}` : ''] })] }), _jsx("td", { children: _jsxs("strong", { children: [parseFloat(w.amount).toFixed(2), "\u20BD"] }) }), _jsxs("td", { className: "text-muted", children: [parseFloat(w.fee).toFixed(2), "\u20BD"] }), _jsx("td", { children: METHOD_LABELS[w.method] || w.method.toUpperCase() }), _jsx("td", { style: { fontFamily: 'monospace', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: w.requisites }), _jsx("td", { children: _jsx("span", { className: `badge ${STATUS_BADGES[w.status] || 'badge-gray'}`, children: STATUS_LABELS[w.status] || w.status }) }), _jsx("td", { className: "text-muted text-sm", children: new Date(w.created_at).toLocaleDateString('ru') }), _jsxs("td", { children: [canAct(w) && (_jsxs("div", { className: "flex gap-8", children: [_jsx("button", { className: "btn btn-primary btn-sm", onClick: () => { setActionId(w.id); setNote(''); setModal('approve'); }, children: "\u2713 \u0412\u044B\u043F\u043B\u0430\u0442\u0438\u0442\u044C" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => { setActionId(w.id); setNote(''); setModal('reject'); }, children: "\u2715 \u041E\u0442\u043A\u043B." })] })), w.admin_note && (_jsx("p", { className: "text-muted text-sm", style: { marginTop: 4 }, children: w.admin_note }))] })] }, w.id))), items.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, style: { textAlign: 'center', color: 'var(--text-muted)', padding: 40 }, children: "\u0417\u0430\u044F\u0432\u043E\u043A \u043D\u0435\u0442" }) }))] })] }) }), _jsxs("div", { className: "mobile-cards", children: [items.map((w) => (_jsxs("div", { className: "mobile-card", children: [_jsxs("div", { className: "mc-header", children: [_jsxs("div", { children: [_jsxs("div", { className: "mc-title", children: [parseFloat(w.amount).toFixed(2), "\u20BD"] }), _jsxs("div", { className: "mc-sub", children: [METHOD_LABELS[w.method] || w.method, " \u00B7", ' ', _jsx("button", { type: "button", onClick: () => navigate('/users', { state: { openUserId: w.user_id } }), style: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }, children: userDisplayName(w) })] })] }), _jsx("span", { className: `badge ${STATUS_BADGES[w.status] || 'badge-gray'}`, children: STATUS_LABELS[w.status] || w.status })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B" }), _jsx("span", { className: "mc-value", style: { fontFamily: 'monospace', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }, children: w.requisites })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F" }), _jsxs("span", { className: "mc-value", children: [parseFloat(w.fee).toFixed(2), "\u20BD"] })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0414\u0430\u0442\u0430 \u0437\u0430\u044F\u0432\u043A\u0438" }), _jsx("span", { className: "mc-value", children: new Date(w.created_at).toLocaleDateString('ru') })] }), w.admin_note && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439" }), _jsx("span", { className: "mc-value text-muted", style: { fontSize: 12 }, children: w.admin_note })] })), canAct(w) && (_jsxs("div", { className: "mc-actions", children: [_jsx("button", { className: "btn btn-primary btn-sm", onClick: () => { setActionId(w.id); setNote(''); setModal('approve'); }, children: "\u2713 \u0412\u044B\u043F\u043B\u0430\u0442\u0438\u0442\u044C" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => { setActionId(w.id); setNote(''); setModal('reject'); }, children: "\u2715 \u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C" })] }))] }, w.id))), items.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' }, children: "\u0417\u0430\u044F\u0432\u043E\u043A \u043D\u0435\u0442" }))] }), modal && (_jsx("div", { className: "modal-overlay", onClick: () => setModal(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "modal-title", children: modal === 'approve' ? '✓ Подтвердить выплату' : '✕ Отклонить заявку' }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsx("input", { value: note, onChange: (e) => setNote(e.target.value), placeholder: "\u041D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E..." })] }), _jsxs("div", { className: "flex gap-8", children: [_jsx("button", { className: `btn ${modal === 'approve' ? 'btn-primary' : 'btn-danger'}`, style: { flex: 1 }, onClick: modal === 'approve' ? handleApprove : handleReject, children: modal === 'approve' ? 'Подтвердить выплату' : 'Отклонить заявку' }), _jsx("button", { className: "btn btn-secondary", onClick: () => setModal(null), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) }))] }));
}
