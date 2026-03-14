import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
/** Форматирование даты для тултипа (DD.MM или DD.MM.YYYY) */
function formatChartDate(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const y = d.getFullYear();
    return `${day}.${month.toString().padStart(2, '0')}.${y}`;
}
// ── Mini SVG bar chart: столбец не меняет вид при наведении (нет дёргания), тултип в фиксированной зоне ────────────────────────────────────────────────────────
const TOOLTIP_ZONE_HEIGHT = 34;
function BarChart({ data, valueKey, color, formatValue, height = 80, }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const values = data.map((d) => d[valueKey]);
    const max = Math.max(...values, 1);
    const BAR_W = 16;
    const GAP = 6;
    const W = data.length * (BAR_W + GAP) - GAP;
    const fmt = formatValue ?? ((v) => String(v));
    return (_jsxs("div", { style: { position: 'relative', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }, onMouseLeave: () => setActiveIndex(null), onScroll: () => setActiveIndex(null), children: [_jsx("div", { style: {
                    minHeight: TOOLTIP_ZONE_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 4,
                }, children: activeIndex !== null && data[activeIndex] !== undefined && (_jsxs("div", { role: "tooltip", style: {
                        padding: '6px 10px',
                        background: 'var(--text)',
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        width: 'fit-content',
                    }, children: [formatChartDate(data[activeIndex].date), " \u2014 ", fmt(data[activeIndex][valueKey])] })) }), _jsx("svg", { width: W, height: height + 8, style: { display: 'block', minWidth: '100%' }, children: data.map((d, i) => {
                    const v = d[valueKey];
                    const barH = Math.max(3, (v / max) * height);
                    const x = i * (BAR_W + GAP);
                    const y = height - barH;
                    return (_jsx("g", { style: { cursor: 'pointer' }, onMouseEnter: () => setActiveIndex(i), onMouseLeave: () => setActiveIndex(null), onClick: (e) => {
                            e.stopPropagation();
                            setActiveIndex((prev) => (prev === i ? null : i));
                        }, children: _jsx("rect", { x: x, y: y, width: BAR_W, height: barH, rx: 4, fill: color, opacity: 0.85 }) }, d.date));
                }) })] }));
}
// ── Chart card ────────────────────────────────────────────────────────────────
function ChartCard({ title, icon, total, totalLabel, data, valueKey, color, formatValue, }) {
    return (_jsxs("div", { className: "card", style: { padding: '18px 20px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }, children: title }), _jsx("div", { style: { fontSize: 22, fontWeight: 800, color, lineHeight: 1.2, marginTop: 2 }, children: total }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: totalLabel })] }), _jsx("span", { style: { fontSize: 28 }, children: icon })] }), _jsx(BarChart, { data: data, valueKey: valueKey, color: color, formatValue: formatValue })] }));
}
export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState([]);
    const [days, setDays] = useState(14);
    useEffect(() => {
        adminApi.stats().then(({ data }) => setStats(data));
    }, []);
    useEffect(() => {
        adminApi.analytics(days).then(({ data }) => setAnalytics(data));
    }, [days]);
    if (!stats)
        return _jsx("div", { className: "loader" });
    const hasPending = stats.pending_withdrawals > 0;
    const CARDS = [
        {
            label: 'Всего пользователей',
            value: stats.total_users.toLocaleString('ru'),
            icon: '👤',
            color: '#2563EB',
            bg: '#EFF6FF',
        },
        {
            label: 'Активны сегодня',
            value: stats.active_today.toLocaleString('ru'),
            icon: '🟢',
            color: '#047935',
            bg: '#ECFDF5',
        },
        {
            label: 'Заданий сегодня',
            value: stats.tasks_completed_today.toLocaleString('ru'),
            icon: '✅',
            color: '#7C3AED',
            bg: '#F5F3FF',
        },
        {
            label: 'Всего выплачено',
            value: `${parseFloat(stats.total_paid_out).toFixed(2)}₽`,
            icon: '💸',
            color: '#047935',
            bg: '#ECFDF5',
        },
        {
            label: 'Заявок на вывод',
            value: stats.pending_withdrawals.toLocaleString('ru'),
            icon: '⏳',
            color: hasPending ? '#8B6200' : 'var(--text-muted)',
            bg: hasPending ? '#FEF9C3' : 'var(--bg)',
            warn: hasPending,
        },
        {
            label: 'Сумма к выплате',
            value: `${parseFloat(stats.pending_amount).toFixed(2)}₽`,
            icon: '🏦',
            color: hasPending ? '#8B6200' : 'var(--text-muted)',
            bg: hasPending ? '#FEF9C3' : 'var(--bg)',
            warn: hasPending,
        },
    ];
    const totalRegs = analytics.reduce((s, d) => s + d.registrations, 0);
    const totalComps = analytics.reduce((s, d) => s + d.completions, 0);
    const totalPayouts = analytics.reduce((s, d) => s + d.payouts, 0);
    return (_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434" }), hasPending && (_jsxs("div", { style: {
                    background: '#FEF9C3',
                    border: '1px solid #FDE047',
                    borderRadius: 12,
                    padding: '14px 18px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#713F12',
                }, children: [_jsx("span", { style: { fontSize: 20 }, children: "\u26A0\uFE0F" }), _jsxs("span", { children: ["\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u0438: ", _jsx("strong", { children: stats.pending_withdrawals }), " \u0437\u0430\u044F\u0432\u043E\u043A \u043D\u0430 \u0432\u044B\u0432\u043E\u0434 \u043D\u0430 \u0441\u0443\u043C\u043C\u0443 ", _jsxs("strong", { children: [parseFloat(stats.pending_amount).toFixed(2), "\u20BD"] })] }), _jsx("a", { href: "/withdrawals", style: { marginLeft: 'auto', color: '#8B6200', textDecoration: 'underline', fontSize: 13 }, children: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u2192" })] })), _jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14,
                    marginBottom: 24,
                }, className: "stats-grid-override", children: CARDS.map((c) => (_jsxs("div", { style: {
                        background: c.bg,
                        border: c.warn ? '1px solid #FDE047' : '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '18px 20px',
                    }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }, children: _jsx("span", { style: { fontSize: 22 }, children: c.icon }) }), _jsx("div", { style: { fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1 }, children: c.value }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }, children: c.label })] }, c.label))) }), _jsxs("div", { className: "analytics-header", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }, children: [_jsx("h2", { style: { fontSize: 16, fontWeight: 700, color: 'var(--text)' }, children: "\uD83D\uDCCA \u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430" }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: [7, 14, 30].map((d) => (_jsxs("button", { onClick: () => setDays(d), style: {
                                padding: '4px 12px',
                                borderRadius: 20,
                                border: `1.5px solid ${days === d ? 'var(--accent)' : 'var(--border)'}`,
                                background: days === d ? 'var(--accent)' : 'transparent',
                                color: days === d ? '#fff' : 'var(--text-muted)',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }, children: [d, " \u0434\u043D."] }, d))) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }, className: "charts-grid", children: [_jsx(ChartCard, { title: "\u041D\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", icon: "\uD83D\uDC64", total: totalRegs.toLocaleString('ru'), totalLabel: `за ${days} дней`, data: analytics, valueKey: "registrations", color: "#2563EB" }), _jsx(ChartCard, { title: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u0439", icon: "\u2705", total: totalComps.toLocaleString('ru'), totalLabel: `за ${days} дней`, data: analytics, valueKey: "completions", color: "#7C3AED" }), _jsx(ChartCard, { title: "\u0412\u044B\u043F\u043B\u0430\u0447\u0435\u043D\u043E", icon: "\uD83D\uDCB8", total: `${totalPayouts.toLocaleString('ru', { maximumFractionDigits: 0 })}₽`, totalLabel: `за ${days} дней`, data: analytics, valueKey: "payouts", color: "#047935", formatValue: (v) => v > 0 ? `${Math.round(v)}` : '' })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }, className: "info-grid", children: [_jsxs("div", { className: "card", style: { padding: '18px 20px' }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }, children: "\uD83D\uDCC8 \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [
                                    {
                                        label: 'Конверсия активных',
                                        value: stats.total_users > 0
                                            ? `${Math.round((stats.active_today / stats.total_users) * 100)}%`
                                            : '0%',
                                        desc: 'Активных сегодня от всех',
                                    },
                                    {
                                        label: 'Среднее заданий/польз.',
                                        value: stats.active_today > 0
                                            ? (stats.tasks_completed_today / stats.active_today).toFixed(1)
                                            : '0',
                                        desc: 'Заданий на активного пользователя',
                                    },
                                    {
                                        label: 'Прирост за период',
                                        value: totalRegs.toLocaleString('ru'),
                                        desc: `Новых за ${days} дней`,
                                    },
                                ].map((item) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: item.label }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: item.desc })] }), _jsx("div", { style: { fontSize: 18, fontWeight: 800, color: 'var(--accent)' }, children: item.value })] }, item.label))) })] }), _jsxs("div", { className: "card", style: { padding: '18px 20px' }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }, children: "\uD83D\uDD17 \u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [
                                    { href: '/tasks', label: '+ Создать новое задание', icon: '✅' },
                                    { href: '/withdrawals', label: 'Проверить заявки на вывод', icon: '💸' },
                                    { href: '/users', label: 'Управление пользователями', icon: '👥' },
                                    { href: '/settings', label: 'Системные настройки', icon: '⚙️' },
                                ].map((link) => (_jsxs("a", { href: link.href, style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 12px',
                                        background: 'var(--bg)',
                                        borderRadius: 10,
                                        textDecoration: 'none',
                                        color: 'var(--text)',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        transition: 'background 0.15s',
                                    }, children: [_jsx("span", { children: link.icon }), _jsx("span", { children: link.label }), _jsx("span", { style: { marginLeft: 'auto', color: 'var(--text-muted)' }, children: "\u2192" })] }, link.href))) })] })] })] }));
}
