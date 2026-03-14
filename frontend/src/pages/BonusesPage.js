import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bonusesApi, tasksApi } from '../api/client';
import { useStore } from '../store';
import { showToast } from '../components/Toast';
import { calcLevel } from '../utils/level';
import LevelBadge from '../components/LevelBadge';
import AppHeader from '../components/AppHeader';
// ── Brand constants ────────────────────────────────────────────────────────────
const GRAD = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)';
const ACCENT = '#23C366';
// ── Speaker / megaphone — 1:1 из bonuses.svg группа id="speaker" (Vector_7..13)
function SpeakerIllustration() {
    return (_jsxs("svg", { width: "56", height: "56", viewBox: "597 358 42 43", fill: "none", style: { flexShrink: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "spkGrad", x1: "597.571", y1: "422.037", x2: "627.113", y2: "419.176", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { offset: "0.434477", stopColor: "#35DE66" }), _jsx("stop", { offset: "0.581125", stopColor: "#2CE1A1" }), _jsx("stop", { offset: "1", stopColor: "#02BBC7" })] }) }), _jsx("path", { d: "M629.402 367.741L635.71 361.494C635.977 361.229 636.42 361.273 636.631 361.585L638.086 363.739C638.287 364.036 638.185 364.441 637.869 364.608L630.106 368.701C629.975 368.77 629.823 368.788 629.679 368.752C629.536 368.716 629.41 368.628 629.327 368.505C629.249 368.389 629.213 368.249 629.227 368.11C629.241 367.97 629.303 367.84 629.402 367.741ZM630.445 373.106C630.469 373.222 630.534 373.325 630.629 373.395C630.724 373.465 630.841 373.498 630.959 373.487L637.911 372.838C637.978 372.832 638.043 372.811 638.102 372.778C638.16 372.745 638.211 372.7 638.251 372.646C638.291 372.592 638.319 372.53 638.334 372.465C638.348 372.399 638.349 372.331 638.336 372.265L637.921 370.239C637.861 369.945 637.548 369.778 637.271 369.892L630.733 372.567C630.63 372.609 630.545 372.686 630.492 372.785C630.439 372.883 630.423 372.997 630.445 373.106ZM625.254 365.729C625.353 365.794 625.472 365.82 625.588 365.803C625.705 365.785 625.811 365.726 625.886 365.635L630.344 360.26C630.386 360.208 630.418 360.148 630.436 360.083C630.454 360.018 630.458 359.95 630.449 359.884C630.439 359.817 630.415 359.754 630.379 359.697C630.343 359.64 630.295 359.592 630.239 359.555L628.513 358.415C628.262 358.25 627.924 358.353 627.808 358.63L625.077 365.144C625.034 365.247 625.028 365.362 625.06 365.469C625.093 365.575 625.161 365.667 625.254 365.729Z", fill: "#FE5A5B" }), _jsx("path", { d: "M614.842 398.299L613.499 399.084C612.407 399.723 611.005 399.355 610.367 398.264L606.807 392.176C606.169 391.085 606.536 389.682 607.627 389.044L608.97 388.259C610.062 387.621 611.464 387.988 612.102 389.079L615.662 395.167C616.301 396.259 615.933 397.661 614.842 398.299Z", fill: "#141416" }), _jsx("path", { d: "M606.612 392.325L619.622 385.242L610.728 371.316L598.968 380.054C598.892 380.102 595.713 383.01 599.204 388.476C602.695 393.942 606.612 392.325 606.612 392.325Z", fill: "url(#spkGrad)" }), _jsx("path", { d: "M626.947 370.785C630.838 376.878 633.196 383.479 631.568 384.519C629.94 385.558 624.942 380.644 621.051 374.551C617.16 368.458 614.802 361.857 616.43 360.817C618.058 359.777 623.055 364.692 626.947 370.785Z", fill: "#727272" }), _jsx("path", { d: "M625.115 379.24C626.463 378.378 626.077 375.363 624.252 372.505C622.426 369.647 619.853 368.029 618.505 368.89C617.156 369.752 617.542 372.767 619.368 375.625C621.193 378.483 623.766 380.101 625.115 379.24Z", fill: "#FFE227" }), _jsx("path", { d: "M631.497 384.564C630.074 385.472 625.244 380.45 621.353 374.357C617.462 368.264 614.937 361.77 616.359 360.862C616.441 360.81 616.533 360.775 616.633 360.756C615.962 360.741 615.305 361.091 614.916 361.835C613.202 365.112 608.828 372.385 608.828 372.385C608.828 372.385 606.657 375.307 610.473 381.281C614.289 387.256 617.973 386.508 617.973 386.508C617.973 386.508 626.341 385.653 630.018 385.478C630.888 385.436 631.495 384.953 631.747 384.301C631.68 384.411 631.597 384.499 631.497 384.564Z", fill: "#141416" }), _jsx("path", { d: "M600.943 383.881C600.744 383.882 600.548 383.832 600.373 383.736C600.199 383.641 600.052 383.503 599.945 383.335C599.593 382.784 599.754 382.053 600.305 381.702L605.168 378.595C605.719 378.244 606.45 378.405 606.802 378.955C607.154 379.506 606.992 380.237 606.442 380.589L601.578 383.695C601.388 383.817 601.168 383.881 600.943 383.881Z", fill: "white" })] }));
}
// ── Copy icon — tabler:copy from bonuses.svg Vector_14+15 ─────────────────────
function CopyIconSvg() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "875 689 22 22", fill: "none", children: [_jsx("path", { d: "M881 697.667C881 696.96 881.281 696.281 881.781 695.781C882.281 695.281 882.96 695 883.667 695H892.333C892.683 695 893.03 695.069 893.354 695.203C893.677 695.337 893.971 695.533 894.219 695.781C894.467 696.029 894.663 696.323 894.797 696.646C894.931 696.97 895 697.317 895 697.667V706.333C895 706.683 894.931 707.03 894.797 707.354C894.663 707.677 894.467 707.971 894.219 708.219C893.971 708.467 893.677 708.663 893.354 708.797C893.03 708.931 892.683 709 892.333 709H883.667C883.317 709 882.97 708.931 882.646 708.797C882.323 708.663 882.029 708.467 881.781 708.219C881.533 707.971 881.337 707.677 881.203 707.354C881.069 707.03 881 706.683 881 706.333V697.667Z", stroke: "white", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M878.012 704.737C877.705 704.563 877.45 704.31 877.272 704.005C877.094 703.7 877 703.353 877 703V693C877 691.9 877.9 691 879 691H889C889.75 691 890.158 691.385 890.5 692", stroke: "white", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
// ── Warning triangle — tabler:info-triangle from bonuses.svg Vector_16+17 ─────
function WarnTriangle() {
    return (_jsxs("svg", { width: "22", height: "20", viewBox: "571 758 23 21", fill: "none", style: { flexShrink: 0, marginTop: 1 }, children: [_jsx("path", { d: "M581.363 760.591L573.257 774.125C573.09 774.415 573.001 774.743 573 775.077C573 775.411 573.086 775.74 573.252 776.03C573.417 776.32 573.656 776.562 573.944 776.732C574.232 776.901 574.559 776.992 574.893 776.996H591.107C591.441 776.992 591.768 776.901 592.056 776.732C592.344 776.562 592.582 776.32 592.748 776.03C592.913 775.74 593 775.412 592.999 775.078C592.998 774.744 592.91 774.416 592.743 774.126L584.637 760.59C584.466 760.309 584.226 760.076 583.939 759.914C583.653 759.753 583.329 759.668 583 759.668C582.671 759.668 582.347 759.753 582.061 759.914C581.774 760.076 581.534 760.309 581.363 760.59M583 766H583.01", stroke: "#9B9FB0", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M582 769H583V773H584", stroke: "#9B9FB0", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
// ── Tab icons (иконки с кнопок табов убраны по ТЗ; FriendsIcon в блоке «Друзья») ──
// UserFriendsIcon (рефералы) — Vector_35 from bonuses.svg
function FriendsIcon({ active }) {
    const c = active ? ACCENT : '#9B9FB0';
    return (_jsx("svg", { width: "22", height: "18", viewBox: "997 800 22 18", fill: "none", children: _jsx("path", { d: "M1004 809C1005.93 809 1007.5 807.434 1007.5 805.5C1007.5 803.566 1005.93 802 1004 802C1002.07 802 1000.5 803.566 1000.5 805.5C1000.5 807.434 1002.07 809 1004 809ZM1006.4 810H1006.14C1005.49 810.312 1004.77 810.5 1004 810.5C1003.23 810.5 1002.51 810.312 1001.86 810H1001.6C999.612 810 998 811.613 998 813.6V814.5C998 815.328 998.672 816 999.5 816H1008.5C1009.33 816 1010 815.328 1010 814.5V813.6C1010 811.613 1008.39 810 1006.4 810ZM1013 809C1014.66 809 1016 807.656 1016 806C1016 804.344 1014.66 803 1013 803C1011.34 803 1010 804.344 1010 806C1010 807.656 1011.34 809 1013 809ZM1014.5 810H1014.38C1013.95 810.15 1013.49 810.25 1013 810.25C1012.51 810.25 1012.05 810.15 1011.62 810H1011.5C1010.86 810 1010.27 810.184 1009.76 810.481C1010.52 811.303 1011 812.394 1011 813.6V814.8C1011 814.869 1010.98 814.934 1010.98 815H1016.5C1017.33 815 1018 814.328 1018 813.5C1018 811.566 1016.43 810 1014.5 810Z", fill: c }) }));
}
// ── Countdown hook (same as TasksPage) ────────────────────────────────────────
function useCountdown(expiresAt) {
    const [rem, setRem] = useState('');
    useEffect(() => {
        if (!expiresAt)
            return;
        const tick = () => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setRem('');
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const f = (n) => String(n).padStart(2, '0');
            setRem(`${f(d)} д : ${f(h)} ч : ${f(m)} м : ${f(s)} с`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);
    return rem;
}
// ── Daily task card — matches bonuses_daily tasks SVG screen ──────────────────
function DailyTaskCard({ task, onClick }) {
    const countdown = useCountdown(task.expires_at);
    const isDone = task.user_status === 'completed';
    return (_jsxs("div", { style: {
            background: '#FFFFFF', borderRadius: 12, border: '1px solid #EEECF9',
            padding: '16px', marginBottom: 10,
            boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
            opacity: isDone ? 0.75 : 1,
        }, children: [_jsx("p", { style: { fontSize: 15, fontWeight: 700, color: '#02020E', textAlign: 'center', marginBottom: 6, lineHeight: 1.3 }, children: task.title }), _jsxs("p", { style: { fontSize: 22, fontWeight: 800, color: ACCENT, textAlign: 'center', marginBottom: 10 }, children: [parseFloat(task.reward).toFixed(0), " \u20BD"] }), countdown && (_jsx("div", { style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#EEECF9', borderRadius: 16.5, padding: '8px 16px',
                    width: '100%', minHeight: 33, boxSizing: 'border-box', marginBottom: 12,
                }, children: _jsx("span", { style: { fontSize: 13, fontWeight: 600, color: '#02020E', letterSpacing: 0.3 }, children: countdown }) })), _jsx("button", { onClick: isDone ? undefined : onClick, style: {
                    width: '100%', height: 44, borderRadius: 22, border: 'none',
                    background: isDone ? '#E2F3EE' : GRAD,
                    color: isDone ? '#047935' : '#fff',
                    fontSize: 15, fontWeight: 700,
                    cursor: isDone ? 'default' : 'pointer',
                }, children: isDone ? '✓ Выполнено' : 'Выполнить' })] }));
}
// ── Simple SVG bar chart for referral income ──────────────────────────────────
function ReferralIncomeChart({ data }) {
    const maxVal = Math.max(...data.map(d => d.amount), 0.01);
    const barW = 16;
    const gap = 4;
    const chartH = 60;
    const totalW = data.length * (barW + gap) - gap;
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return (_jsx("div", { style: { padding: '0 16px', marginTop: 8 }, children: _jsxs("div", { style: { background: '#fff', borderRadius: 12, padding: '14px 16px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }, children: [_jsx("p", { style: { fontSize: 12, fontWeight: 700, color: '#4D536D', marginBottom: 10, letterSpacing: 0.3 }, children: "\u0414\u041E\u0425\u041E\u0414 \u041E\u0422 \u0420\u0415\u0424\u0415\u0420\u0410\u041B\u041E\u0412 \u00B7 14 \u0414\u041D\u0415\u0419" }), _jsx("svg", { width: "100%", viewBox: `0 0 ${totalW} ${chartH + 18}`, preserveAspectRatio: "none", style: { overflow: 'visible' }, children: data.map((d, i) => {
                        const barH = Math.max(2, (d.amount / maxVal) * chartH);
                        const x = i * (barW + gap);
                        const y = chartH - barH;
                        const hasIncome = d.amount > 0;
                        const date = new Date(d.date);
                        const showLabel = i === 0 || i === data.length - 1 || date.getDate() === 1;
                        return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: barW, height: barH, rx: 3, fill: hasIncome ? '#23C366' : '#EEECF9' }), hasIncome && (_jsx("text", { x: x + barW / 2, y: y - 3, textAnchor: "middle", fontSize: 8, fill: "#23C366", fontWeight: 700, children: d.amount.toFixed(0) })), showLabel && (_jsxs("text", { x: x + barW / 2, y: chartH + 14, textAnchor: "middle", fontSize: 8, fill: "#9B9FB0", children: [date.getDate(), " ", monthNames[date.getMonth()]] }))] }, d.date));
                    }) })] }) }));
}
// ── Main page ─────────────────────────────────────────────────────────────────
export default function BonusesPage() {
    const navigate = useNavigate();
    const { bonuses, setBonuses, user, tasks: storeTasks, setTasks } = useStore();
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('daily');
    const [incomeHistory, setIncomeHistory] = useState([]);
    useEffect(() => {
        Promise.all([
            bonusesApi.get().then(({ data }) => setBonuses(data)),
            storeTasks.length === 0
                ? tasksApi.list({ page: 1, page_size: 20 }).then(({ data }) => setTasks(data.tasks, data.completed_today))
                : Promise.resolve(),
            bonusesApi.incomeHistory().then(({ data }) => setIncomeHistory(data)).catch(() => { }),
        ]).finally(() => setLoading(false));
    }, []);
    const copyLink = () => {
        if (!bonuses)
            return;
        const link = bonuses.referral_link || '';
        const text = `Привет! 👋

Есть бот, где можно немного заработать на простых заданиях в интернете. Всё без вложений — ничего покупать не нужно. Оплата приходит на карту или по номеру телефона.

Если интересно, вот ссылка: ${link}`;
        navigator.clipboard.writeText(text);
        showToast('Текст со ссылкой скопирован!', 'success');
    };
    const shareLink = () => {
        if (!bonuses)
            return;
        const url = bonuses.referral_link;
        const text = `Привет! 👋

Есть бот, где можно немного заработать на простых заданиях в интернете. Всё без вложений — ничего покупать не нужно. Оплата приходит на карту или по номеру телефона.

Если интересно, вот ссылка: ${url}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        const tg = window.Telegram?.WebApp;
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ url, text, title: 'TaskCash' }).catch(() => {
                if (tg?.openTelegramLink)
                    tg.openTelegramLink(shareUrl);
                else
                    window.open(shareUrl, '_blank');
            });
        }
        else if (tg?.openTelegramLink) {
            tg.openTelegramLink(shareUrl);
        }
        else {
            window.open(shareUrl, '_blank');
        }
    };
    if (loading)
        return _jsx("div", { className: "loader", children: _jsx("div", { className: "spinner" }) });
    const level = calcLevel(parseFloat(user?.total_earned ?? '0'));
    const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь';
    const refsCount = bonuses?.referrals_count ?? 0;
    const totalEarned = parseFloat(String(bonuses?.total_from_referrals || '0'));
    const shortLink = (bonuses?.referral_link || '').replace('https://', '');
    // Available daily tasks (not completed, with expiry = daily-ish)
    const dailyTasks = storeTasks.filter(t => t.user_status !== 'completed').slice(0, 5);
    return (_jsxs("div", { className: "page", style: { background: '#F5F5F5' }, children: [_jsx(AppHeader, { title: "TASKCASH" }), _jsx("div", { style: { background: '#FFFFFF', borderBottom: '1px solid #E5E6EE', flexShrink: 0 }, children: _jsxs("div", { onClick: () => navigate('/profile'), style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 10px', cursor: 'pointer' }, children: [user?.photo_url ? (_jsx("img", { src: user.photo_url, alt: "", style: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #EEECF9', flexShrink: 0 }, referrerPolicy: "no-referrer", loading: "eager" })) : (_jsx("div", { style: { width: 36, height: 36, borderRadius: '50%', background: '#9292A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }, children: (user?.first_name || 'U')[0].toUpperCase() })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 700, color: '#02020E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: displayName }), _jsx("svg", { width: "6", height: "10", viewBox: "0 0 6 10", fill: "none", style: { flexShrink: 0 }, children: _jsx("path", { d: "M1 1L5 5L1 9", stroke: "#9B9FB0", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }), _jsx(LevelBadge, { level: level })] }) }), _jsx("div", { style: {
                    background: '#F5F5F5',
                    borderBottom: '1px solid #EEECF9',
                    padding: '10px 16px',
                    flexShrink: 0,
                }, children: _jsxs("div", { style: {
                        display: 'flex',
                        background: '#F8F8FA',
                        borderRadius: 25,
                        border: '2px solid #fff',
                        boxShadow: '0 0 0 1.5px #EEECF9',
                        padding: 3,
                        gap: 2,
                    }, children: [_jsx("button", { onClick: () => setTab('daily'), style: {
                                flex: 1, height: 44, borderRadius: 22, border: 'none',
                                background: tab === 'daily' ? ACCENT : 'transparent',
                                color: tab === 'daily' ? '#fff' : '#9B9FB0',
                                fontSize: 13, fontWeight: tab === 'daily' ? 700 : 500,
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0435" }), _jsx("button", { onClick: () => setTab('referrals'), style: {
                                flex: 1, height: 44, borderRadius: 22, border: 'none',
                                background: tab === 'referrals' ? ACCENT : 'transparent',
                                color: tab === 'referrals' ? '#fff' : '#9B9FB0',
                                fontSize: 13, fontWeight: tab === 'referrals' ? 700 : 500,
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: "\u0420\u0435\u0444\u0435\u0440\u0430\u043B\u044B" })] }) }), _jsxs("div", { className: "scroll-area", style: { background: '#F5F5F5' }, children: [tab === 'daily' && (_jsxs("div", { style: { padding: '12px 16px 24px', background: '#F5F5F5' }, children: [_jsx("p", { style: { fontSize: 12, color: ACCENT, fontWeight: 600, textAlign: 'center', marginBottom: 12 }, children: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u044D\u0442\u0438\u0445 \u0437\u0430\u0434\u0430\u0447 \u043E\u0442\u043A\u0440\u043E\u0435\u0442 Premium \u0437\u0430\u0434\u0430\u043D\u0438\u044F" }), dailyTasks.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '40px 20px', color: '#9B9FB0' }, children: [_jsx("div", { style: { fontSize: 40, marginBottom: 12 }, children: "\uD83C\uDF81" }), _jsx("p", { style: { fontSize: 15, fontWeight: 700, color: '#02020E', marginBottom: 6 }, children: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u0437\u0430\u0434\u0430\u043D\u0438\u0439" }), _jsx("p", { style: { fontSize: 13 }, children: "\u0412\u0441\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u044B!" })] })) : (dailyTasks.map(task => (_jsx(DailyTaskCard, { task: task, onClick: () => navigate(`/tasks/${task.id}`) }, task.id))))] })), tab === 'referrals' && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 0', background: '#F5F5F5' }, children: [_jsx(SpeakerIllustration, {}), _jsx("p", { style: { fontSize: 16, fontWeight: 700, color: '#02020E', lineHeight: 1.3, flex: 1 }, children: "\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u0435 \u0434\u0440\u0443\u0437\u0435\u0439 \u0438 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0439\u0442\u0435 \u0431\u043E\u043D\u0443\u0441\u044B!" })] }), _jsxs("div", { style: {
                                    margin: '12px 16px 0',
                                    background: '#FFFFFF', borderRadius: 12,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    display: 'flex', alignItems: 'stretch',
                                }, children: [_jsxs("div", { style: { flex: 1, textAlign: 'center', padding: '16px 12px' }, children: [_jsx("div", { style: { fontSize: 36, fontWeight: 800, color: '#02020E', lineHeight: 1 }, children: refsCount }), _jsx("div", { style: { fontSize: 12, color: '#9B9FB0', marginTop: 5 }, children: "\u0420\u0435\u0444\u0435\u0440\u0430\u043B\u043E\u0432" })] }), _jsx("div", { style: { width: 1, background: '#EEECF9', margin: '14px 0' } }), _jsxs("div", { style: { flex: 1, textAlign: 'center', padding: '16px 12px' }, children: [_jsxs("div", { style: { fontSize: 32, fontWeight: 800, color: refsCount > 0 ? ACCENT : '#02020E', lineHeight: 1 }, children: [totalEarned.toFixed(0), " \u20BD"] }), _jsx("div", { style: { fontSize: 12, color: '#9B9FB0', marginTop: 5 }, children: "\u0417\u0430\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E" })] })] }), bonuses && (bonuses.referral_reward != null || bonuses.referral_min_tasks != null) && (_jsxs("div", { style: {
                                    margin: '12px 16px 0',
                                    background: '#E2F3EE',
                                    borderRadius: 12,
                                    padding: '12px 14px',
                                }, children: [_jsx("p", { style: { fontSize: 12, fontWeight: 600, color: '#02020E', marginBottom: 4 }, children: "\u0420\u0430\u0441\u0447\u0451\u0442 \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F" }), _jsxs("p", { style: { fontSize: 12, color: '#4D536D', lineHeight: 1.4 }, children: [Number(bonuses.referral_reward ?? 0).toFixed(0), " \u20BD \u0437\u0430 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0440\u0435\u0444\u0435\u0440\u0430\u043B\u0430, \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0432\u0448\u0435\u0433\u043E \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 ", bonuses.referral_min_tasks ?? 0, " \u0437\u0430\u0434\u0430\u043D\u0438\u0439."] })] })), incomeHistory.length > 0 && incomeHistory.some(d => d.amount > 0) && (_jsx("div", { style: { background: '#F5F5F5' }, children: _jsx(ReferralIncomeChart, { data: incomeHistory }) })), _jsx("p", { style: { fontSize: 11, color: ACCENT, textAlign: 'center', padding: '6px 16px 0', background: '#F5F5F5' }, children: "\u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0440\u0430\u0437 \u0432 10 \u043C\u0438\u043D\u0443\u0442" }), refsCount === 0 && (_jsxs("div", { style: { textAlign: 'center', padding: '8px 16px 0', background: '#F5F5F5' }, children: [_jsx("p", { style: { fontSize: 15, fontWeight: 700, color: '#4D536D', marginBottom: 6 }, children: "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0440\u0435\u0444\u0435\u0440\u0430\u043B\u043E\u0432" }), _jsx("p", { style: { fontSize: 13, color: ACCENT, fontWeight: 600 }, children: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u0441 \u0434\u0440\u0443\u0437\u044C\u044F\u043C\u0438!" })] })), _jsx("p", { style: { fontSize: 13, fontWeight: 600, color: ACCENT, padding: '14px 16px 0', background: '#F5F5F5' }, children: "\u0412\u0430\u0448\u0430 \u0440\u0435\u0444\u0435\u0440\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430" }), _jsxs("div", { style: { display: 'flex', gap: 8, padding: '8px 16px 0', background: '#F5F5F5' }, children: [_jsx("div", { style: {
                                            flex: 1, background: '#E2F3EE', borderRadius: 8, height: 48,
                                            display: 'flex', alignItems: 'center', paddingLeft: 14, overflow: 'hidden',
                                        }, children: _jsx("span", { style: { fontSize: 12, color: '#4D536D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: shortLink || '—' }) }), _jsx("button", { onClick: copyLink, style: {
                                            width: 48, height: 48, borderRadius: 8,
                                            background: GRAD, border: 'none', cursor: 'pointer',
                                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }, children: _jsx(CopyIconSvg, {}) })] }), _jsxs("div", { style: {
                                    margin: '10px 16px 0',
                                    background: '#EEECF9', borderRadius: 8, padding: '10px 12px',
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                }, children: [_jsx(WarnTriangle, {}), _jsx("p", { style: { fontSize: 11, color: '#9B9FB0', lineHeight: 1.5 }, children: "\u041A\u0430\u0436\u0434\u044B\u0439 \u0440\u0435\u0444\u0435\u0440\u0430\u043B \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443; \u043F\u0440\u0438 \u0432\u044B\u044F\u0432\u043B\u0435\u043D\u0438\u0438 \u043D\u0430\u043A\u0440\u0443\u0442\u043A\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u0431\u0435\u0437 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F." })] }), _jsx("div", { style: { padding: '12px 16px 0', background: '#F5F5F5' }, children: _jsx("button", { onClick: shareLink, style: {
                                        width: '100%', height: 48, borderRadius: 24, border: 'none',
                                        background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                                    }, children: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u0441\u0441\u044B\u043B\u043A\u043E\u0439" }) }), bonuses && bonuses.referrals.length > 0 && (_jsxs("div", { style: { padding: '16px 16px 0', background: '#F5F5F5' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }, children: [_jsx(FriendsIcon, { active: true }), _jsx("span", { style: { fontSize: 13, fontWeight: 800, color: '#02020E', letterSpacing: 0.5, textTransform: 'uppercase' }, children: "\u0414\u0440\u0443\u0437\u044C\u044F" })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: bonuses.referrals.map((ref, i) => (_jsxs("div", { style: {
                                                background: '#FFFFFF', borderRadius: 12, border: '1px solid #EEECF9',
                                                display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10,
                                            }, children: [_jsx("div", { style: {
                                                        width: 22, height: 22, borderRadius: 11,
                                                        background: '#F8F8FA', border: '1px solid #EEECF9',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 11, fontWeight: 700, color: '#4D536D', flexShrink: 0,
                                                    }, children: i + 1 }), _jsxs("div", { style: { position: 'relative', flexShrink: 0 }, children: [_jsx("div", { style: { width: 36, height: 36, borderRadius: 18, background: '#D9D9D9' } }), _jsx("div", { style: {
                                                                position: 'absolute', bottom: 0, right: 0,
                                                                width: 10, height: 10, borderRadius: 5,
                                                                background: ref.status === 'active' ? ACCENT : ref.status === 'blocked' ? '#EF4444' : '#9B9FB0',
                                                                border: '1.5px solid #fff',
                                                            } })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("p", { style: { fontSize: 14, fontWeight: 600, color: '#02020E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [ref.first_name, ref.username && _jsxs("span", { style: { fontWeight: 400, color: '#9B9FB0', fontSize: 12 }, children: [" @", ref.username] })] }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }, children: ref.status === 'blocked' ? (_jsx("span", { style: { fontSize: 10, fontWeight: 700, color: '#EF4444', background: '#FEE2E2', borderRadius: 20, padding: '2px 8px' }, children: "\uD83D\uDEAB \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D" })) : ref.status === 'active' ? (_jsx("span", { style: { fontSize: 10, fontWeight: 700, color: '#047935', background: '#DCFCE7', borderRadius: 20, padding: '2px 8px' }, children: "\u2705 \u0410\u043A\u0442\u0438\u0432\u0435\u043D" })) : (ref.tasks_completed ?? 0) > 0 ? (_jsxs("span", { style: { fontSize: 10, fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', borderRadius: 20, padding: '2px 8px' }, children: ["\uD83D\uDD04 ", ref.tasks_completed, " ", (ref.tasks_completed ?? 0) === 1 ? 'задание' : (ref.tasks_completed ?? 0) < 5 ? 'задания' : 'заданий', " \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E"] })) : (_jsx("span", { style: { fontSize: 10, fontWeight: 700, color: '#9B9FB0', background: '#F1F5F9', borderRadius: 20, padding: '2px 8px' }, children: "\uD83C\uDD95 \u041D\u043E\u0432\u044B\u0439" })) })] }), _jsxs("span", { style: { fontSize: 14, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap', flexShrink: 0 }, children: ["+", parseFloat(String(ref.earned_from)).toFixed(0), " \u20BD"] })] }, ref.telegram_id))) })] })), _jsx("div", { style: { height: 24 } })] }))] })] }));
}
