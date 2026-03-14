import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi, withdrawalsApi, bonusesApi, settingsApi } from '../api/client';
import { useStore } from '../store';
import { showToast } from '../components/Toast';
import { calcLevel, levelProgress, nextLevelAt } from '../utils/level';
import LevelBadge from '../components/LevelBadge';
const C = {
    bg: '#F5F5F5',
    name: '#2B2A2E',
    sub: '#9292A1',
    label: '#4D536D',
    border: '#EEECF9',
    accent: '#23C366',
    gradStart: '#35DE66',
    gradMid: '#2CE1A1',
    gradEnd: '#02BBC7',
    white: '#ffffff',
    badgeFill: '#F8F8FA',
};
const GRAD = `linear-gradient(135deg, ${C.gradStart} 0%, ${C.gradMid} 55%, ${C.gradEnd} 100%)`;
const METHODS = [
    { id: 'card', label: '💳 На карту', placeholder: '0000 0000 0000 0000', hint: 'Номер банковской карты (16 цифр)' },
    { id: 'sbp', label: '📱 Через СБП', placeholder: '+7 (___) ___-__-__', hint: 'Номер телефона привязанного к СБП' },
];
function formatCardInput(val) {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
function formatPhoneInput(val) {
    let digits = val.replace(/\D/g, '');
    if (digits.length && (digits[0] === '8' || digits[0] === '7'))
        digits = '7' + digits.slice(1);
    else if (digits.length)
        digits = '7' + digits;
    digits = digits.slice(0, 11);
    if (digits.length <= 1)
        return digits ? '+7' : '';
    const a = digits.slice(1, 4);
    const b = digits.slice(4, 7);
    const c = digits.slice(7, 9);
    const d = digits.slice(9, 11);
    let out = '+7';
    if (a.length)
        out += ' (' + a;
    if (b.length)
        out += (a.length === 3 ? ') ' : '') + b;
    if (c.length)
        out += (b.length === 3 ? '-' : '') + c;
    if (d.length)
        out += (c.length === 2 ? '-' : '') + d;
    return out;
}
const PAGE_SIZE = 20;
// ── Settings gear icon — EXACT path from ic:round-settings in profile.svg; размер вдвое больше (44×44) ──
function GearIcon() {
    return (
    // viewBox covers the 40×40 button area at x=439,y=365 from profile.svg
    _jsx("svg", { width: "44", height: "44", viewBox: "439 365 40 40", fill: "none", children: _jsx("path", { d: "M466.5 385C466.5 384.77 466.49 384.55 466.47 384.32L468.33 382.91C468.73 382.61 468.84 382.05 468.59 381.61L466.72 378.38C466.6 378.168 466.406 378.008 466.175 377.931C465.945 377.853 465.694 377.864 465.47 377.96L463.32 378.87C462.95 378.61 462.56 378.38 462.15 378.19L461.86 375.88C461.8 375.38 461.37 375 460.87 375H457.14C456.63 375 456.2 375.38 456.14 375.88L455.85 378.19C455.44 378.38 455.05 378.61 454.68 378.87L452.53 377.96C452.07 377.76 451.53 377.94 451.28 378.38L449.41 381.62C449.16 382.06 449.27 382.61 449.67 382.92L451.53 384.33C451.488 384.779 451.488 385.231 451.53 385.68L449.67 387.09C449.27 387.39 449.16 387.95 449.41 388.39L451.28 391.62C451.53 392.06 452.07 392.24 452.53 392.04L454.68 391.13C455.05 391.39 455.44 391.62 455.85 391.81L456.14 394.12C456.2 394.62 456.63 395 457.13 395H460.86C461.36 395 461.79 394.62 461.85 394.12L462.14 391.81C462.55 391.62 462.94 391.39 463.31 391.13L465.46 392.04C465.92 392.24 466.46 392.06 466.71 391.62L468.58 388.39C468.83 387.95 468.72 387.4 468.32 387.09L466.46 385.68C466.49 385.45 466.5 385.23 466.5 385ZM459.04 388.5C457.11 388.5 455.54 386.93 455.54 385C455.54 383.07 457.11 381.5 459.04 381.5C460.97 381.5 462.54 383.07 462.54 385C462.54 386.93 460.97 388.5 459.04 388.5Z", fill: "#4D536D" }) }));
}
// ── Avatar (photo or initial); photo_url from store or Telegram initDataUnsafe for mobile ──
function Avatar({ photoUrl, firstName, size = 68 }) {
    const [imgErr, setImgErr] = useState(false);
    if (photoUrl && !imgErr) {
        return (_jsx("img", { src: photoUrl, alt: "", referrerPolicy: "no-referrer", loading: "eager", decoding: "async", onError: () => setImgErr(true), style: {
                width: size,
                height: size,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: `3px solid ${C.white}`,
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                backgroundColor: C.bg,
            } }));
    }
    return (_jsx("div", { style: {
            width: size,
            height: size,
            borderRadius: '50%',
            background: GRAD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.38,
            fontWeight: 700,
            color: C.white,
            flexShrink: 0,
            border: `3px solid ${C.white}`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }, children: (firstName || 'U')[0].toUpperCase() }));
}
// ── History icon — EXACT path from material-symbols:history-rounded in profile.svg (line 83) ──
function HistoryIcon() {
    return (
    // viewBox covers icon at x=136..158, y=817..835 from profile.svg
    _jsx("svg", { width: "20", height: "20", viewBox: "136 815 22 22", fill: "none", children: _jsx("path", { d: "M148 835C145.9 835 144.042 834.363 142.425 833.088C140.808 831.813 139.758 830.184 139.275 828.2C139.208 827.95 139.258 827.721 139.425 827.513C139.592 827.305 139.817 827.184 140.1 827.15C140.367 827.117 140.608 827.167 140.825 827.3C141.042 827.433 141.192 827.633 141.275 827.9C141.675 829.4 142.5 830.625 143.75 831.575C145 832.525 146.417 833 148 833C149.95 833 151.604 832.321 152.963 830.963C154.322 829.605 155.001 827.951 155 826C154.999 824.049 154.32 822.395 152.963 821.038C151.606 819.681 149.951 819.001 148 819C146.85 819 145.775 819.267 144.775 819.8C143.775 820.333 142.933 821.067 142.25 822H144C144.283 822 144.521 822.096 144.713 822.288C144.905 822.48 145.001 822.717 145 823C144.999 823.283 144.903 823.52 144.712 823.713C144.521 823.906 144.283 824.001 144 824H140C139.717 824 139.479 823.904 139.288 823.712C139.097 823.52 139.001 823.283 139 823V819C139 818.717 139.096 818.479 139.288 818.288C139.48 818.097 139.717 818.001 140 818C140.283 817.999 140.52 818.095 140.713 818.288C140.906 818.481 141.001 818.718 141 819V820.35C141.85 819.283 142.888 818.458 144.113 817.875C145.338 817.292 146.634 817 148 817C149.25 817 150.421 817.238 151.513 817.713C152.605 818.188 153.555 818.83 154.363 819.637C155.171 820.444 155.813 821.394 156.288 822.487C156.763 823.58 157.001 824.751 157 826C156.999 827.249 156.762 828.42 156.288 829.513C155.814 830.606 155.172 831.556 154.363 832.363C153.554 833.17 152.604 833.812 151.513 834.288C150.422 834.764 149.251 835.001 148 835ZM149 825.6L151.5 828.1C151.683 828.283 151.775 828.517 151.775 828.8C151.775 829.083 151.683 829.317 151.5 829.5C151.317 829.683 151.083 829.775 150.8 829.775C150.517 829.775 150.283 829.683 150.1 829.5L147.3 826.7C147.2 826.6 147.125 826.488 147.075 826.363C147.025 826.238 147 826.109 147 825.975V822C147 821.717 147.096 821.479 147.288 821.288C147.48 821.097 147.717 821.001 148 821C148.283 820.999 148.52 821.095 148.713 821.288C148.906 821.481 149.001 821.718 149 822V825.6Z", fill: "#23C366" }) }));
}
// ═══════════════════════════════════════════════════════════════════
// ── Withdrawal status labels and colors ──────────────────────────────────────
const W_STATUS = {
    created: { label: 'Создана', color: '#4D536D', bg: '#F0F1F8' },
    processing: { label: 'В обработке', color: '#8B6200', bg: '#FDF3CD' },
    security_check: { label: 'Проверка', color: '#8B6200', bg: '#FDF3CD' },
    paid: { label: 'Выплачено', color: '#047935', bg: '#E2F3EE' },
    rejected: { label: 'Отклонено', color: '#EF4444', bg: '#FEE2E2' },
};
const TX_FILTERS = [
    { key: '', label: 'Все' },
    { key: 'task_reward', label: 'Задания' },
    { key: 'referral_bonus', label: 'Рефералы' },
    { key: 'withdrawal', label: 'Выводы' },
];
export default function ProfilePage() {
    const { profile, setProfile, setUser, user } = useStore();
    const [bonuses, setBonuses] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [txFilter, setTxFilter] = useState('');
    const [txDateFrom, setTxDateFrom] = useState('');
    const [txDateTo, setTxDateTo] = useState('');
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [historyTab, setHistoryTab] = useState('tx');
    const [txPage, setTxPage] = useState(1);
    const [txPages, setTxPages] = useState(1);
    const [txLoadingMore, setTxLoadingMore] = useState(false);
    const [loading, setLoading] = useState(!profile);
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);
    const [wAmount, setWAmount] = useState('');
    const [wMethod, setWMethod] = useState('card');
    const [wRequisites, setWRequisites] = useState('');
    const [wFio, setWFio] = useState('');
    const [wLoading, setWLoading] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);
    const [minWithdrawal, setMinWithdrawal] = useState(10);
    const [feePercent, setFeePercent] = useState(5);
    const navigate = useNavigate();
    const loadTransactions = useCallback(async (p, typeFilter, append = false, dateFrom = '', dateTo = '') => {
        if (!append)
            setLoading(true);
        else
            setTxLoadingMore(true);
        try {
            const { data } = await profileApi.transactions({
                page: p,
                page_size: PAGE_SIZE,
                tx_type: typeFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            setTransactions((prev) => append ? [...prev, ...data.items] : data.items);
            setTxPage(data.page);
            setTxPages(data.pages);
        }
        finally {
            setLoading(false);
            setTxLoadingMore(false);
        }
    }, []);
    useEffect(() => {
        Promise.all([
            profileApi.get(),
            bonusesApi.get(),
            profileApi.transactions({ page: 1, page_size: 1, tx_type: 'task_reward' }),
            withdrawalsApi.list(),
        ]).then(([p, b, ct, wd]) => {
            const data = p.data;
            if (data && (data.id != null || data.telegram_id)) {
                setProfile(p.data);
                const cur = useStore.getState().user;
                setUser({ ...(cur || {}), ...p.data, photo_url: p.data.photo_url ?? cur?.photo_url ?? null });
            }
            setBonuses(b.data);
            setCompletedCount(ct.data.total);
            setWithdrawals(wd.data);
        });
        settingsApi.public().then(({ data }) => {
            if (data.min_withdrawal) {
                const v = parseFloat(data.min_withdrawal);
                if (!isNaN(v))
                    setMinWithdrawal(v);
            }
            if (data.withdrawal_fee_percent) {
                const v = parseFloat(data.withdrawal_fee_percent);
                if (!isNaN(v))
                    setFeePercent(v);
            }
        }).catch(() => { });
        loadTransactions(1, '');
    }, []);
    // Reload transactions when filter or dates change
    useEffect(() => {
        setTxPage(1);
        loadTransactions(1, txFilter, false, txDateFrom, txDateTo);
    }, [txFilter, txDateFrom, txDateTo]);
    const handleWithdraw = async () => {
        const amount = parseFloat(wAmount);
        if (!amount || amount <= 0)
            return showToast('Введите сумму', 'error');
        if (amount < minWithdrawal)
            return showToast(`Минимальная сумма вывода: ${minWithdrawal}₽`, 'error');
        if (amount > balance)
            return showToast('Недостаточно средств на балансе', 'error');
        const effectiveFio = (user?.full_name ?? '').trim() || wFio.trim();
        if (!effectiveFio)
            return showToast('Введите ФИО (полностью) для получения выплаты', 'error');
        if (!wRequisites.trim())
            return showToast('Введите реквизиты', 'error');
        setWLoading(true);
        try {
            await withdrawalsApi.create({
                amount,
                method: wMethod,
                requisites: wRequisites,
                ...(effectiveFio && !user?.full_name ? { full_name: effectiveFio } : {}),
            });
            const [updated, wdList] = await Promise.all([profileApi.get(), withdrawalsApi.list()]);
            const data = updated.data;
            if (data && (data.id != null || data.telegram_id)) {
                setProfile(updated.data);
                const cur = useStore.getState().user;
                setUser(cur ? { ...cur, ...updated.data, photo_url: updated.data.photo_url ?? cur.photo_url ?? null } : updated.data);
            }
            setWithdrawals(wdList.data);
            setShowWithdrawForm(false);
            setWAmount('');
            setWRequisites('');
            setWFio('');
            showToast('Заявка на вывод создана', 'success');
        }
        catch (err) {
            const msg = err?.response?.data?.detail || 'Ошибка';
            showToast(msg, 'error');
        }
        finally {
            setWLoading(false);
        }
    };
    if (loading && !profile)
        return _jsx("div", { className: "loader", children: _jsx("div", { className: "spinner" }) });
    const p = profile;
    const totalEarned = parseFloat(p?.total_earned || '0');
    const balance = parseFloat(p?.balance || '0');
    const balancePending = parseFloat(p?.balance_pending || '0');
    const level = calcLevel(totalEarned);
    const progress = levelProgress(totalEarned);
    const nextAt = nextLevelAt(totalEarned);
    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь';
    const refsCount = bonuses?.referrals_count ?? 0;
    const activeMethod = METHODS.find((m) => m.id === wMethod);
    return (_jsxs("div", { className: "page", style: { background: C.bg }, children: [_jsxs("div", { className: "scroll-area", children: [_jsxs("div", { style: {
                            background: C.bg,
                            padding: '20px 16px 0',
                            paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, children: [_jsx(LevelBadge, { level: level, size: 48 }), _jsx(Avatar, { photoUrl: user?.photo_url ??
                                            (typeof window !== 'undefined'
                                                ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url
                                                : null) ??
                                            null, firstName: user?.first_name || 'U', size: 72 }), _jsx("button", { type: "button", onClick: () => navigate('/profile/settings'), style: {
                                            width: 48,
                                            height: 48,
                                            minWidth: 48,
                                            minHeight: 48,
                                            borderRadius: '50%',
                                            background: C.white,
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(77,83,109,0.18)',
                                            flexShrink: 0,
                                            position: 'relative',
                                            zIndex: 10,
                                        }, "aria-label": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", children: _jsx(GearIcon, {}) })] }), _jsxs("div", { style: { textAlign: 'center', marginBottom: 16 }, children: [_jsx("p", { style: { fontSize: 20, fontWeight: 700, color: C.name, letterSpacing: '-0.3px', lineHeight: 1.2 }, children: displayName }), user?.username && (_jsxs("p", { style: { fontSize: 13, color: C.sub, marginTop: 4 }, children: ["@", user.username] })), _jsxs("p", { style: { fontSize: 11, color: C.sub, marginTop: 2 }, children: ["ID: ", user?.telegram_id] })] }), _jsx("div", { style: { marginBottom: 8 }, children: _jsx("div", { style: {
                                        height: 8, borderRadius: 4,
                                        background: C.border, overflow: 'hidden',
                                    }, children: _jsx("div", { style: {
                                            height: '100%', borderRadius: 4,
                                            background: GRAD,
                                            width: `${progress}%`,
                                            transition: 'width 0.5s ease',
                                        } }) }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 20 }, children: [_jsxs("span", { style: { fontSize: 11, color: C.label }, children: ["\u0423\u0440\u043E\u0432\u0435\u043D\u044C ", level] }), _jsxs("span", { style: { fontSize: 11, color: C.sub }, children: [totalEarned.toFixed(0), "\u20BD / ", nextAt, "\u20BD"] }), _jsxs("span", { style: { fontSize: 11, color: C.label }, children: ["\u0423\u0440\u043E\u0432\u0435\u043D\u044C ", level + 1] })] })] }), _jsx("div", { style: { padding: '0 16px' }, children: _jsxs("div", { style: {
                                background: GRAD,
                                borderRadius: 16,
                                padding: '16px 16px 14px',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 4px 20px rgba(35,195,102,0.30)',
                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }, children: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E" }), _jsxs("p", { style: { fontSize: 36, fontWeight: 800, color: C.white, letterSpacing: '-1.5px', lineHeight: 1 }, children: [balance.toFixed(2), "\u20BD"] }), _jsxs("p", { style: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }, children: ["\u0412\u0441\u0435\u0433\u043E: ", totalEarned.toFixed(2), "\u20BD"] }), balancePending > 0 && (_jsxs("p", { style: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }, children: ["\u23F3 ", balancePending.toFixed(2), "\u20BD \u043E\u0436\u0438\u0434\u0430\u0435\u0442"] }))] }), _jsx("div", { style: {
                                                width: 54, height: 54, borderRadius: '50%',
                                                background: C.bg,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 26, flexShrink: 0,
                                            }, children: "\uD83D\uDCB0" })] }), _jsx("div", { style: { display: 'flex', justifyContent: 'center', marginTop: 14 }, children: _jsx("button", { onClick: () => setShowWithdrawForm(true), style: {
                                            width: 164, height: 44, borderRadius: 22,
                                            border: 'none', cursor: 'pointer',
                                            background: C.white,
                                            color: C.accent,
                                            fontWeight: 700, fontSize: 14,
                                        }, children: "\u0412\u044B\u0432\u0435\u0441\u0442\u0438 \u0434\u0435\u043D\u044C\u0433\u0438" }) })] }) }), _jsx("div", { style: { padding: '12px 16px 0' }, children: _jsx("div", { style: {
                                background: C.white, borderRadius: 12, padding: '16px 0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                            }, children: _jsxs("div", { style: { display: 'flex' }, children: [_jsxs("div", { style: { flex: 1, padding: '4px 16px', textAlign: 'center' }, children: [_jsx("p", { style: { fontSize: 38, fontWeight: 800, color: C.label, lineHeight: 1 }, children: completedCount }), _jsx("p", { style: { fontSize: 12, color: C.sub, marginTop: 6, fontWeight: 500 }, children: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u0439" })] }), _jsx("div", { style: { width: 1, background: C.border, alignSelf: 'stretch', margin: '4px 0' } }), _jsxs("div", { style: { flex: 1, padding: '4px 16px', textAlign: 'center' }, children: [_jsx("p", { style: { fontSize: 38, fontWeight: 800, color: C.label, lineHeight: 1 }, children: refsCount }), _jsx("p", { style: { fontSize: 12, color: C.sub, marginTop: 6, fontWeight: 500 }, children: "\u0420\u0435\u0444\u0435\u0440\u0430\u043B\u043E\u0432" })] })] }) }) }), _jsxs("div", { style: { padding: '20px 16px 0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }, children: [_jsx(HistoryIcon, {}), _jsx("span", { style: { fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 0.3 }, children: "\u0418\u0421\u0422\u041E\u0420\u0418\u042F" })] }), _jsx("div", { style: { display: 'flex', background: '#F0F1F8', borderRadius: 12, padding: 3, gap: 3 }, children: [['tx', 'Транзакции'], ['wd', 'Заявки на вывод']].map(([key, label]) => (_jsx("button", { onClick: () => setHistoryTab(key), style: {
                                        flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                                        background: historyTab === key ? C.white : 'none',
                                        color: historyTab === key ? C.accent : C.sub,
                                        fontWeight: historyTab === key ? 700 : 500,
                                        fontSize: 13, cursor: 'pointer',
                                        boxShadow: historyTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                        transition: 'all 0.15s',
                                    }, children: label }, key))) })] }), historyTab === 'tx' && (_jsxs("div", { style: { padding: '10px 16px' }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }, children: _jsxs("div", { style: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }, children: [TX_FILTERS.map(({ key, label }) => (_jsx("button", { onClick: () => setTxFilter(key), style: {
                                                padding: '5px 12px', borderRadius: 100, border: 'none', flexShrink: 0,
                                                background: txFilter === key ? C.accent : C.white,
                                                color: txFilter === key ? C.white : C.label,
                                                fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                            }, children: label }, key))), _jsxs("button", { onClick: () => setShowDateFilter(!showDateFilter), style: {
                                                padding: '5px 12px', borderRadius: 100, border: 'none', flexShrink: 0,
                                                background: (txDateFrom || txDateTo) ? C.accent : showDateFilter ? '#E2F3EE' : C.white,
                                                color: (txDateFrom || txDateTo) ? C.white : C.label,
                                                fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                            }, children: ["\uD83D\uDCC5 \u0414\u0430\u0442\u044B ", txDateFrom || txDateTo ? '✓' : ''] })] }) }), showDateFilter && (_jsx("div", { style: {
                                    background: '#E2F3EE', borderRadius: 10, padding: '10px 12px',
                                    marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8,
                                }, children: _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 10, fontWeight: 600, color: C.label, marginBottom: 3 }, children: "\u0421 \u0434\u0430\u0442\u044B" }), _jsx("input", { type: "date", value: txDateFrom, onChange: (e) => setTxDateFrom(e.target.value), style: {
                                                        width: '100%', padding: '6px 8px', borderRadius: 6,
                                                        border: `1px solid ${C.border}`, fontSize: 13,
                                                        background: C.white, color: C.name, boxSizing: 'border-box',
                                                    } })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 10, fontWeight: 600, color: C.label, marginBottom: 3 }, children: "\u041F\u043E \u0434\u0430\u0442\u0443" }), _jsx("input", { type: "date", value: txDateTo, onChange: (e) => setTxDateTo(e.target.value), style: {
                                                        width: '100%', padding: '6px 8px', borderRadius: 6,
                                                        border: `1px solid ${C.border}`, fontSize: 13,
                                                        background: C.white, color: C.name, boxSizing: 'border-box',
                                                    } })] }), (txDateFrom || txDateTo) && (_jsx("button", { onClick: () => { setTxDateFrom(''); setTxDateTo(''); }, style: {
                                                marginTop: 16, padding: '6px 10px', borderRadius: 6, border: 'none',
                                                background: '#FEE2E2', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                flexShrink: 0,
                                            }, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C" }))] }) })), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 32 }, children: _jsx("div", { className: "spinner" }) })) : transactions.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '32px 0 16px' }, children: [_jsx("p", { style: { fontSize: 15, fontWeight: 600, color: C.label, marginBottom: 6 }, children: "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439" }), _jsx("p", { style: { fontSize: 13, color: C.accent, marginBottom: 20 }, children: "\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0439\u0442\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0438 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0439\u0442\u0435!" }), _jsx("button", { onClick: () => navigate('/tasks'), style: {
                                            height: 46, borderRadius: 23, border: 'none',
                                            background: GRAD, color: C.white,
                                            fontWeight: 700, fontSize: 15, cursor: 'pointer', padding: '0 28px',
                                        }, children: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u044F" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { background: C.white, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }, children: transactions.map((tx, i) => (_jsxs("div", { children: [_jsxs("div", { style: { padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: { width: 38, height: 38, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: _jsx(HistoryIcon, {}) }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: 13, fontWeight: 600, color: C.name }, children: tx.description }), _jsx("p", { style: { fontSize: 11, color: C.sub, marginTop: 2 }, children: new Date(tx.created_at).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' }) })] })] }), _jsxs("span", { style: { fontWeight: 700, fontSize: 14, color: parseFloat(tx.amount) >= 0 ? C.accent : '#EF4444', whiteSpace: 'nowrap' }, children: [parseFloat(tx.amount) >= 0 ? '+' : '', parseFloat(tx.amount).toFixed(2), "\u20BD"] })] }), i < transactions.length - 1 && _jsx("div", { style: { height: 1, background: C.border, margin: '0 16px' } })] }, tx.id))) }), txPage < txPages && (_jsx("div", { style: { textAlign: 'center', padding: '12px 0' }, children: _jsx("button", { onClick: () => loadTransactions(txPage + 1, txFilter, true, txDateFrom, txDateTo), disabled: txLoadingMore, style: {
                                                padding: '8px 24px', borderRadius: 100,
                                                border: `1.5px solid ${C.accent}`, background: 'none', color: C.accent,
                                                fontWeight: 600, fontSize: 13, cursor: txLoadingMore ? 'default' : 'pointer',
                                                opacity: txLoadingMore ? 0.6 : 1,
                                            }, children: txLoadingMore ? 'Загрузка...' : 'Ещё' }) }))] }))] })), historyTab === 'wd' && (_jsx("div", { style: { padding: '10px 16px' }, children: withdrawals.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '32px 0 16px' }, children: [_jsx("p", { style: { fontSize: 15, fontWeight: 600, color: C.label, marginBottom: 6 }, children: "\u0417\u0430\u044F\u0432\u043E\u043A \u043D\u0430 \u0432\u044B\u0432\u043E\u0434 \u043D\u0435\u0442" }), _jsx("p", { style: { fontSize: 13, color: C.sub }, children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u0437\u0430\u044F\u0432\u043A\u0443 \u0447\u0435\u0440\u0435\u0437 \u043A\u043D\u043E\u043F\u043A\u0443 \u00AB\u0412\u044B\u0432\u0435\u0441\u0442\u0438 \u0434\u0435\u043D\u044C\u0433\u0438\u00BB" })] })) : (_jsx("div", { style: { background: C.white, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }, children: withdrawals.map((wd, i) => {
                                const s = W_STATUS[wd.status] ?? { label: wd.status, color: C.sub, bg: C.bg };
                                const methodLabel = wd.method === 'card' ? '💳 На карту' : '📱 СБП';
                                return (_jsxs("div", { children: [_jsxs("div", { style: { padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }, children: [_jsx("span", { style: { fontSize: 13, fontWeight: 700, color: C.name }, children: methodLabel }), _jsx("span", { style: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: s.bg, color: s.color }, children: s.label })] }), _jsx("p", { style: { fontSize: 11, color: C.sub }, children: wd.requisites }), _jsxs("p", { style: { fontSize: 11, color: C.sub, marginTop: 1 }, children: [new Date(wd.created_at).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' }), wd.processed_at && ` → ${new Date(wd.processed_at).toLocaleDateString('ru', { day: '2-digit', month: 'short' })}`] }), wd.admin_note && (_jsx("p", { style: { fontSize: 11, color: '#EF4444', marginTop: 2 }, children: wd.admin_note }))] }), _jsxs("div", { style: { textAlign: 'right', flexShrink: 0 }, children: [_jsxs("p", { style: { fontSize: 15, fontWeight: 800, color: C.name }, children: [parseFloat(wd.amount).toFixed(0), "\u20BD"] }), _jsxs("p", { style: { fontSize: 11, color: C.sub }, children: ["\u2212", parseFloat(wd.fee).toFixed(0), "\u20BD \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u044F"] })] })] }), i < withdrawals.length - 1 && _jsx("div", { style: { height: 1, background: C.border, margin: '0 16px' } })] }, wd.id));
                            }) })) })), _jsx("div", { style: { height: 32 } })] }), showWithdrawForm && (_jsx("div", { style: {
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 20px',
                }, onClick: () => setShowWithdrawForm(false), children: _jsxs("div", { style: {
                        width: '100%', maxWidth: 400, background: C.white,
                        borderRadius: 20,
                        padding: '24px 20px 36px',
                        maxHeight: '90vh', overflowY: 'auto',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: 18, fontWeight: 700, color: C.name }, children: "\u0412\u044B\u0432\u043E\u0434 \u0434\u0435\u043D\u0435\u0433" }), _jsxs("p", { style: { fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 2 }, children: [balance.toFixed(0), " \u20BD"] })] }), _jsx("button", { onClick: () => setShowWithdrawForm(false), style: {
                                        width: 32, height: 32, borderRadius: '50%',
                                        border: 'none', background: C.bg,
                                        fontSize: 18, cursor: 'pointer', color: C.label,
                                    }, children: "\u00D7" })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, color: C.label, display: 'block', marginBottom: 6 }, children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0424\u0418\u041E" }), user?.full_name ? (_jsx("div", { style: {
                                        padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`,
                                        background: C.bg, fontSize: 15, color: C.name,
                                    }, children: user.full_name })) : (_jsx("input", { type: "text", placeholder: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F \u0418\u043C\u044F \u041E\u0442\u0447\u0435\u0441\u0442\u0432\u043E", value: wFio, onChange: (e) => setWFio(e.target.value), style: {
                                        width: '100%', padding: '13px 14px', borderRadius: 12,
                                        border: `1.5px solid ${C.border}`, fontSize: 15,
                                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                        background: C.white, color: C.name,
                                    } })), user?.full_name && (_jsx("p", { style: { fontSize: 11, color: C.sub, marginTop: 4 }, children: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0424\u0418\u041E \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0435\u0440\u0435\u0437 \u0442\u0435\u0445\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443" }))] }), _jsx("div", { style: { display: 'flex', gap: 8, marginBottom: 16 }, children: METHODS.map((m) => (_jsx("button", { onClick: () => { setWMethod(m.id); setWRequisites(''); }, style: {
                                    flex: 1, padding: '12px 8px', borderRadius: 12,
                                    border: `2px solid ${wMethod === m.id ? C.accent : C.border}`,
                                    background: wMethod === m.id ? 'rgba(35,195,102,0.08)' : C.bg,
                                    fontWeight: 600, fontSize: 14,
                                    color: wMethod === m.id ? C.accent : C.label, cursor: 'pointer',
                                }, children: m.label }, m.id))) }), _jsx("input", { type: "number", placeholder: "\u0421\u0443\u043C\u043C\u0430 (\u20BD)", value: wAmount, onChange: (e) => setWAmount(e.target.value), style: {
                                width: '100%', padding: '13px 14px', borderRadius: 12,
                                border: `1.5px solid ${C.border}`, fontSize: 16,
                                marginBottom: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                background: C.white, color: C.name,
                            } }), _jsx("input", { type: "text", inputMode: wMethod === 'card' ? 'numeric' : 'tel', placeholder: activeMethod.placeholder, value: wRequisites, onChange: (e) => {
                                const v = e.target.value;
                                setWRequisites(wMethod === 'card' ? formatCardInput(v) : formatPhoneInput(v));
                            }, maxLength: wMethod === 'card' ? 19 : 18, style: {
                                width: '100%', padding: '13px 14px', borderRadius: 12,
                                border: `1.5px solid ${C.border}`, fontSize: 14,
                                marginBottom: 6, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                background: C.white, color: C.name,
                            } }), _jsx("p", { style: { marginBottom: 8, fontSize: 11, color: C.sub }, children: activeMethod.hint }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: [_jsx("circle", { cx: "8", cy: "8", r: "7", stroke: "#23C366", strokeWidth: "1.5" }), _jsx("path", { d: "M8 4.5V8.5M8 10.5V11.5", stroke: "#23C366", strokeWidth: "1.5", strokeLinecap: "round" })] }), _jsx("span", { style: { fontSize: 12, color: C.sub }, children: "\u0412\u044B\u043F\u043B\u0430\u0442\u0430: \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E 24/7" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: [_jsx("circle", { cx: "8", cy: "8", r: "7", stroke: "#23C366", strokeWidth: "1.5" }), _jsx("path", { d: "M5 8l2 2 4-4", stroke: "#23C366", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { style: { fontSize: 12, color: C.sub }, children: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u0411\u0435\u0437 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430" })] })] }), _jsxs("div", { style: { marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsxs("p", { style: { fontSize: 12, color: C.sub }, children: ["\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F: ", feePercent, "% \u00B7 \u041C\u0438\u043D. ", minWithdrawal, "\u20BD"] }), parseFloat(wAmount) >= minWithdrawal && (_jsxs("p", { style: { fontSize: 13, fontWeight: 700, color: C.accent }, children: ["\u0412\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435: ", (parseFloat(wAmount) * (1 - feePercent / 100)).toFixed(0), "\u20BD"] }))] }), _jsx("button", { onClick: handleWithdraw, disabled: wLoading, style: {
                                width: '100%', height: 50, borderRadius: 25, border: 'none',
                                background: GRAD, color: C.white, fontWeight: 700, fontSize: 16,
                                cursor: wLoading ? 'default' : 'pointer',
                                opacity: wLoading ? 0.6 : 1,
                            }, children: wLoading ? '...' : 'Подтвердить вывод' })] }) }))] }));
}
