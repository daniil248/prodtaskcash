import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
function trustColor(score) {
    if (score < 35)
        return '#FE5A5B';
    if (score < 60)
        return '#F59E0B';
    return '#047935';
}
export default function UsersPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [actionUser, setActionUser] = useState(null);
    const [banNote, setBanNote] = useState('');
    const [adjAmount, setAdjAmount] = useState('');
    const [adjReason, setAdjReason] = useState('');
    const [modal, setModal] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editFio, setEditFio] = useState('');
    const [fioSaving, setFioSaving] = useState(false);
    const openDetail = async (u) => {
        setActionUser(u);
        setDetail(null);
        setEditFio(u.full_name ?? '');
        setModal('detail');
        setDetailLoading(true);
        try {
            const { data } = await adminApi.userDetail(u.id);
            setDetail(data);
        }
        finally {
            setDetailLoading(false);
        }
    };
    const saveFio = async () => {
        if (!actionUser)
            return;
        setFioSaving(true);
        try {
            const { data } = await adminApi.updateUser(actionUser.id, { full_name: editFio.trim() || undefined });
            setActionUser(data);
            if (detail)
                setDetail({ ...detail, user: data });
            setUsers((prev) => prev.map((u) => (u.id === actionUser.id ? data : u)));
        }
        finally {
            setFioSaving(false);
        }
    };
    const load = () => adminApi.users(page, search || undefined).then(({ data }) => setUsers(data));
    useEffect(() => { load(); }, [page, search]);
    // Открыть карточку пользователя по переходу из выводов (state.openUserId)
    useEffect(() => {
        const openUserId = location.state?.openUserId;
        if (openUserId == null)
            return;
        navigate(location.pathname, { replace: true, state: {} });
        setDetail(null);
        setModal('detail');
        setDetailLoading(true);
        adminApi.userDetail(openUserId).then(({ data }) => {
            setActionUser(data.user);
            setDetail(data);
        }).finally(() => setDetailLoading(false));
    }, []);
    const handleBan = async () => {
        if (!actionUser)
            return;
        await adminApi.banUser(actionUser.id, banNote);
        setModal(null);
        load();
    };
    const handleUnban = async (id) => {
        await adminApi.unbanUser(id);
        load();
    };
    const handleBalance = async () => {
        if (!actionUser || !adjAmount)
            return;
        await adminApi.adjustBalance(actionUser.id, parseFloat(adjAmount), adjReason);
        setModal(null);
        setAdjAmount('');
        setAdjReason('');
        load();
    };
    return (_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438" }), _jsxs("div", { className: "search-bar", children: [_jsx("input", { placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0438\u043C\u0435\u043D\u0438 \u0438\u043B\u0438 @username", value: search, onChange: (e) => { setSearch(e.target.value); setPage(1); } }), _jsxs("div", { className: "flex gap-8", style: { flexShrink: 0 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page === 1, children: "\u2190" }), _jsxs("span", { style: { padding: '5px 8px', fontSize: 13, whiteSpace: 'nowrap' }, children: ["\u0441\u0442\u0440. ", page] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setPage((p) => p + 1), disabled: users.length < 50, children: "\u2192" })] })] }), _jsx("div", { className: "card desktop-table", style: { padding: 0, overflow: 'hidden' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID / TG ID" }), _jsx("th", { children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }), _jsx("th", { children: "\u0411\u0430\u043B\u0430\u043D\u0441" }), _jsx("th", { children: "\u0417\u0430\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E" }), _jsx("th", { children: "Trust" }), _jsx("th", { children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("th", { children: "\u0414\u0430\u0442\u0430" }), _jsx("th", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: users.map((u) => (_jsxs("tr", { children: [_jsxs("td", { className: "text-muted text-sm", children: [u.id, " / ", u.telegram_id] }), _jsxs("td", { children: [_jsx("strong", { children: u.first_name }), u.username && _jsxs("span", { className: "text-muted", children: [" @", u.username] })] }), _jsxs("td", { children: [parseFloat(u.balance).toFixed(2), "\u20BD"] }), _jsxs("td", { children: [parseFloat(u.total_earned).toFixed(2), "\u20BD"] }), _jsx("td", { children: _jsx("span", { style: { color: trustColor(u.trust_score), fontWeight: 700 }, children: u.trust_score }) }), _jsx("td", { children: _jsx("span", { className: `badge ${u.is_banned ? 'badge-red' : 'badge-green'}`, children: u.is_banned ? 'Заблокирован' : 'Активен' }) }), _jsx("td", { className: "text-muted text-sm", children: new Date(u.created_at).toLocaleDateString('ru') }), _jsx("td", { children: _jsxs("div", { className: "flex gap-8", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => openDetail(u), children: "\u0414\u0435\u0442\u0430\u043B\u0438" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => { setActionUser(u); setAdjAmount(''); setModal('balance'); }, children: "\u0411\u0430\u043B\u0430\u043D\u0441" }), u.is_banned ? (_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => handleUnban(u.id), children: "\u0420\u0430\u0437\u0431\u043B\u043E\u043A." })) : (_jsx("button", { className: "btn btn-danger btn-sm", onClick: () => { setActionUser(u); setBanNote(''); setModal('ban'); }, children: "\u0411\u0430\u043D" }))] }) })] }, u.id))) })] }) }), _jsxs("div", { className: "mobile-cards", children: [users.map((u) => (_jsxs("div", { className: "mobile-card", children: [_jsxs("div", { className: "mc-header", children: [_jsxs("div", { children: [_jsxs("div", { className: "mc-title", children: [u.first_name, u.username && _jsxs("span", { style: { fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }, children: [" @", u.username] })] }), _jsxs("div", { className: "mc-sub", children: ["ID ", u.id, " \u00B7 TG ", u.telegram_id] })] }), _jsx("span", { className: `badge ${u.is_banned ? 'badge-red' : 'badge-green'}`, children: u.is_banned ? 'Бан' : 'Активен' })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0411\u0430\u043B\u0430\u043D\u0441" }), _jsxs("span", { className: "mc-value", style: { fontWeight: 700 }, children: [parseFloat(u.balance).toFixed(2), "\u20BD"] })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0417\u0430\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E" }), _jsxs("span", { className: "mc-value", children: [parseFloat(u.total_earned).toFixed(2), "\u20BD"] })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "Trust Score" }), _jsx("span", { className: "mc-value", style: { fontWeight: 700, color: trustColor(u.trust_score) }, children: u.trust_score })] }), _jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D" }), _jsx("span", { className: "mc-value", children: new Date(u.created_at).toLocaleDateString('ru') })] }), u.ban_reason && (_jsxs("div", { className: "mc-row", children: [_jsx("span", { className: "mc-label", children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0431\u0430\u043D\u0430" }), _jsx("span", { className: "mc-value", style: { color: 'var(--red)', fontSize: 12 }, children: u.ban_reason })] })), _jsxs("div", { className: "mc-actions", style: { flexWrap: 'wrap' }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => openDetail(u), children: "\uD83D\uDD0D \u0414\u0435\u0442\u0430\u043B\u0438" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => { setActionUser(u); setAdjAmount(''); setModal('balance'); }, children: "\uD83D\uDCB0 \u0411\u0430\u043B\u0430\u043D\u0441" }), u.is_banned ? (_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => handleUnban(u.id), children: "\u2705 \u0420\u0430\u0437\u0431\u043B\u043E\u043A." })) : (_jsx("button", { className: "btn btn-danger btn-sm", onClick: () => { setActionUser(u); setBanNote(''); setModal('ban'); }, children: "\uD83D\uDEAB \u0417\u0430\u0431\u043B\u043E\u043A." }))] })] }, u.id))), users.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' }, children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }))] }), modal === 'detail' && actionUser && (_jsx("div", { className: "modal-overlay", onClick: () => setModal(null), children: _jsxs("div", { className: "modal", style: { maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }, onClick: (e) => e.stopPropagation(), children: [_jsxs("h2", { className: "modal-title", children: ["\uD83D\uDD0D ", actionUser.first_name, actionUser.username && _jsxs("span", { style: { fontWeight: 400, color: 'var(--text-muted)', fontSize: 15 }, children: [" @", actionUser.username] })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }, children: [
                                { label: 'Баланс', value: `${parseFloat(actionUser.balance).toFixed(2)}₽` },
                                { label: 'ФИО (для вывода)', value: actionUser.full_name || '—' },
                                { label: 'Заработано', value: `${parseFloat(actionUser.total_earned).toFixed(2)}₽` },
                                { label: 'Trust Score', value: actionUser.trust_score, color: trustColor(actionUser.trust_score) },
                                { label: 'Telegram ID', value: actionUser.telegram_id },
                                { label: 'Статус', value: actionUser.is_banned ? '🚫 Заблокирован' : '✅ Активен' },
                                { label: 'Зарегистрирован', value: new Date(actionUser.created_at).toLocaleDateString('ru') },
                            ].map((s) => (_jsxs("div", { style: { background: 'var(--bg)', borderRadius: 10, padding: '10px 14px' }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }, children: s.label }), _jsx("div", { style: { fontSize: 15, fontWeight: 700, color: s.color || 'var(--text)' }, children: s.value })] }, s.label))) }), actionUser && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }, children: "\u0424\u0418\u041E \u0434\u043B\u044F \u0432\u044B\u0432\u043E\u0434\u0430" }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("input", { value: editFio, onChange: (e) => setEditFio(e.target.value), placeholder: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F \u0418\u043C\u044F \u041E\u0442\u0447\u0435\u0441\u0442\u0432\u043E", style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 } }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: saveFio, disabled: fioSaving, children: fioSaving ? '...' : 'Сохранить' })] })] })), detailLoading && _jsx("div", { style: { textAlign: 'center', color: 'var(--text-muted)', padding: 20 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), detail && (_jsxs(_Fragment, { children: [detail.completed_tasks.length > 0 && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }, children: ["\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F (", detail.completed_tasks.length, ")"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: detail.completed_tasks.map((t, i) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }, children: [_jsx("span", { children: t.task_title }), _jsxs("span", { style: { color: 'var(--accent)', fontWeight: 600 }, children: ["+", t.reward.toFixed(0), "\u20BD"] })] }, i))) })] })), detail.withdrawals.length > 0 && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }, children: "\u0417\u0430\u044F\u0432\u043A\u0438 \u043D\u0430 \u0432\u044B\u0432\u043E\u0434" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: detail.withdrawals.map((w) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }, children: [_jsxs("span", { children: [w.amount.toFixed(2), "\u20BD \u00B7 ", w.method.toUpperCase()] }), _jsx("span", { className: `badge ${w.status === 'paid' ? 'badge-green' : w.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`, style: { fontSize: 11 }, children: w.status })] }, w.id))) })] })), detail.transactions.length > 0 && (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }, children: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: detail.transactions.map((t) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12 }, children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: t.description || t.tx_type }), _jsxs("span", { style: { fontWeight: 600, color: t.amount >= 0 ? 'var(--accent)' : 'var(--red)', flexShrink: 0, marginLeft: 8 }, children: [t.amount >= 0 ? '+' : '', t.amount.toFixed(2), "\u20BD"] })] }, t.id))) })] }))] })), _jsx("div", { style: { marginTop: 16 }, children: _jsx("button", { className: "btn btn-secondary", style: { width: '100%' }, onClick: () => setModal(null), children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }) })] }) })), modal === 'ban' && actionUser && (_jsx("div", { className: "modal-overlay", onClick: () => setModal(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsxs("h2", { className: "modal-title", children: ["\uD83D\uDEAB \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C ", actionUser.first_name, "?"] }), _jsxs("p", { style: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }, children: ["\u0411\u0430\u043B\u0430\u043D\u0441: ", parseFloat(actionUser.balance).toFixed(2), "\u20BD \u00B7 Trust: ", actionUser.trust_score] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438" }), _jsx("input", { value: banNote, onChange: (e) => setBanNote(e.target.value), placeholder: "\u041C\u043E\u0448\u0435\u043D\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u043D\u0430\u043A\u0440\u0443\u0442\u043A\u0430..." })] }), _jsxs("div", { className: "flex gap-8", children: [_jsx("button", { className: "btn btn-danger", style: { flex: 1 }, onClick: handleBan, children: "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C" }), _jsx("button", { className: "btn btn-secondary", onClick: () => setModal(null), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) })), modal === 'balance' && actionUser && (_jsx("div", { className: "modal-overlay", onClick: () => setModal(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "modal-title", children: "\uD83D\uDCB0 \u041A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0430" }), _jsxs("p", { className: "text-muted mb-16", style: { fontSize: 13 }, children: [actionUser.first_name, " \u00B7 \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ", _jsxs("strong", { children: [parseFloat(actionUser.balance).toFixed(2), "\u20BD"] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0421\u0443\u043C\u043C\u0430 (\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F)" }), _jsx("input", { type: "number", value: adjAmount, onChange: (e) => setAdjAmount(e.target.value), placeholder: "100.00" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0438" }), _jsx("input", { value: adjReason, onChange: (e) => setAdjReason(e.target.value), placeholder: "\u0420\u0443\u0447\u043D\u0430\u044F \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0430..." })] }), _jsxs("div", { className: "flex gap-8", children: [_jsx("button", { className: "btn btn-primary", style: { flex: 1 }, onClick: handleBalance, children: "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C" }), _jsx("button", { className: "btn btn-secondary", onClick: () => setModal(null), children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) }))] }));
}
