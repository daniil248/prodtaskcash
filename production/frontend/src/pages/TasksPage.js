import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, settingsApi, getApiErrorMessage } from '../api/client';
import { useStore } from '../store';
import { showToast } from '../components/Toast';
import { calcLevel } from '../utils/level';
import LevelBadge from '../components/LevelBadge';
import AppHeader from '../components/AppHeader';
// ── Brand constants (from tasks.svg / components.svg) ─────────────────────────
const GRAD = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)';
const ACCENT = '#23C366';
// ── SVG icons extracted directly from tasks.svg ───────────────────────────────
// bi:fire — full path Vector_5 from tasks.svg (both outer + inner flame), gradient paint5_linear_0_1
function FireIcon() {
    return (_jsxs("svg", { width: "18", height: "22", viewBox: "158 341 20 26", fill: "none", children: [_jsx("path", { d: "M168 366C172.971 366 177 363 177 357.75C177 355.5 176.25 351.75 173.25 348.75C173.625 351 171.375 351.75 171.375 351.75C172.5 348 169.5 342.75 165 342C165.536 345 165.75 348 162 351C160.125 352.5 159 355.094 159 357.75C159 363 163.029 366 168 366ZM168 364.5C165.515 364.5 163.5 363 163.5 360.375C163.5 359.25 163.875 357.375 165.375 355.875C165.188 357 166.5 357.75 166.5 357.75C165.938 355.875 167.25 352.875 169.5 352.5C169.231 354 169.125 355.5 171 357C171.938 357.75 172.5 359.046 172.5 360.375C172.5 363 170.486 364.5 168 364.5Z", fill: "url(#fireGrad)" }), _jsx("defs", { children: _jsxs("linearGradient", { id: "fireGrad", x1: "168", y1: "342", x2: "168", y2: "366", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { stopColor: "#FFC400" }), _jsx("stop", { offset: "1", stopColor: "#FB2E00" })] }) })] }));
}
// VIP badge — exact from tasks.svg badge VIP (red arrow shape)
function VipBadge() {
    return (_jsx("div", { style: { position: 'absolute', left: 0, bottom: 0, overflow: 'hidden', borderRadius: '0 0 0 11px' }, children: _jsxs("svg", { width: "70", height: "22", viewBox: "136 929 70 22", fill: "none", children: [_jsx("path", { d: "M136 929H206L196.602 939.809L206 950H136V929Z", fill: "#FE5A5B" }), _jsx("path", { d: "M166.806 941.87H166.942L168.398 935H171.748L168.809 944.864H164.939L162 935H165.35L166.806 941.87Z", fill: "white" }), _jsx("path", { d: "M175.787 944.864H172.889V935H175.787V944.864Z", fill: "white" }), _jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M181.966 935C182.736 935 183.401 935.148 183.962 935.444C184.527 935.741 184.962 936.158 185.268 936.695C185.577 937.233 185.732 937.867 185.732 938.596V938.609C185.732 939.339 185.577 939.97 185.268 940.508C184.962 941.045 184.527 941.462 183.962 941.758C183.401 942.055 182.736 942.203 181.966 942.203H180.512V944.864H177.614V935H181.966ZM180.512 937.449V939.754H181.748C182.105 939.754 182.381 939.659 182.576 939.468C182.772 939.274 182.869 939.01 182.869 938.677V938.663C182.869 938.335 182.772 938.073 182.576 937.878C182.381 937.679 182.105 937.58 181.748 937.58L180.512 937.449Z", fill: "white" })] }) }));
}
// Days of week abbreviations
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAILY_MAX = 5;
const STATUS_TABS = [
    { key: 'new', label: 'Новые' },
    { key: 'in_progress', label: 'В процессе' },
    { key: 'done', label: 'Выполненные' },
];
const PAGE_SIZE = 20;
// ─── Countdown hook ────────────────────────────────────────────────────────────
// Returns "Осталось: 00 мин:38 сек" format (matching SVG card_9 "00 мин:38 сек" label)
function useCountdown(expiresAt) {
    const [remaining, setRemaining] = useState('');
    useEffect(() => {
        if (!expiresAt) {
            setRemaining('');
            return;
        }
        const tick = () => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setRemaining('');
                return;
            }
            const fmt = (n) => String(n).padStart(2, '0');
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (h > 0) {
                setRemaining(`Осталось: ${fmt(h)} ч ${fmt(m)} мин`);
            }
            else {
                setRemaining(`Осталось: ${fmt(m)} мин:${fmt(s)} сек`);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);
    return remaining;
}
// ─── Task card — exact SVG structure from components.svg ──────────────────────
// Character illustration per task type (3D renders in /chars/)
const CHAR_IMGS = {
    subscribe: '/chars/subscribe.png',
    like: '/chars/like.png',
    watch_ad: '/chars/watch_ad.png',
    invite: '/chars/invite.png',
};
// Card image area bg tints per type
const TYPE_BG = {
    subscribe: '#FFF0F0',
    like: '#FFF0F6',
    watch_ad: '#FFF5E6',
    invite: '#F0F5FF',
};
// Green timer icon — material-symbols:timer-outline-rounded (green, tasks.svg Vector_6)
function GreenTimerIcon() {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.06-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z", fill: ACCENT }) }));
}
// Hourglass icon — game-icons:sands-of-time (tasks.svg task_20 / card_9 task_7)
function HourglassIcon() {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0 }, children: _jsx("path", { d: "M6 2v6l4 4-4 4v6h12v-6l-4-4 4-4V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5-4-4V4h8v3.5l-4 4z", fill: "#8B6200" }) }));
}
// Check mark — ic:round-check from components.svg Property 1=done_2
function CheckIcon() {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z", fill: "#047935" }) }));
}
// Image container — 87×80 from SVG "image container" group
function CardImage({ task, greyed }) {
    const charImg = CHAR_IMGS[task.task_type];
    const bg = greyed ? '#F0F4F0' : (TYPE_BG[task.task_type] ?? '#F8F8FA');
    return (_jsx("div", { style: {
            width: 87, height: 80, flexShrink: 0,
            background: bg,
            borderRadius: '12px 0 0 12px',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: task.icon_url ? (_jsx("img", { src: task.icon_url, alt: "", style: { width: 87, height: 80, objectFit: 'cover' } })) : charImg ? (_jsx("img", { src: charImg, alt: "", style: { width: 87, height: 87, objectFit: 'contain', objectPosition: 'center center', filter: greyed ? 'grayscale(0.5) opacity(0.7)' : 'none' } })) : (_jsx("span", { style: { fontSize: 32 }, children: { subscribe: '📢', like: '❤️', watch_ad: '▶️', invite: '🤝' }[task.task_type] || '🎯' })) }));
}
function TaskCardItem({ task, onClick, onCancelSuccess }) {
    const isDone = task.user_status === 'completed';
    const isChecking = task.user_status === 'checking';
    const isProgress = task.user_status === 'in_progress';
    const isVip = task.is_vip === true;
    // local state for inline in_progress actions
    const [actionLoading, setActionLoading] = useState(false);
    const { updateTask } = useStore();
    const expiresCountdown = useCountdown(isProgress || isChecking ? (task.expires_at ?? null) : null);
    const dailyLimit = task.daily_limit ?? 1;
    const todayCount = task.user_today_completions ?? 0;
    // Progress "X из Y" makes sense only for repeatable tasks (watch_ad watches per day, invite)
    // subscribe and like are one-time actions — never show "0 из 1" or wrong daily_limit
    const showProgress = (task.task_type === 'watch_ad' || task.task_type === 'invite')
        && (dailyLimit > 1 || todayCount > 0);
    const durationMins = task.task_type === 'watch_ad' && task.duration_seconds
        ? Math.ceil(task.duration_seconds / 60)
        : null;
    const handleCheck = async (e) => {
        e.stopPropagation();
        setActionLoading(true);
        try {
            const { data } = await tasksApi.check(task.id);
            updateTask({
                ...task,
                user_status: data.status,
                error_message: (data.status === 'failed' || data.status === 'expired') ? data.message : undefined,
            });
            if (data.status === 'completed') {
                showToast(`+${parseFloat(task.reward).toFixed(0)}₽ начислено!`, 'success');
            }
            else if (data.status === 'failed' || data.status === 'expired') {
                showToast(data.message || 'Задание не выполнено', 'error');
            }
        }
        catch (err) {
            const msg = getApiErrorMessage(err);
            showToast(msg, 'error');
            // Синхронизируем статус с сервером (например, проверка уже идёт или завершилась)
            try {
                const { data: statusData } = await tasksApi.getStatus(task.id);
                if (statusData.user_status != null) {
                    updateTask({
                        ...task,
                        user_status: statusData.user_status,
                        error_message: statusData.error_message ?? undefined,
                    });
                }
            }
            catch { /* ignore */ }
        }
        finally {
            setActionLoading(false);
        }
    };
    const handleCancel = async (e) => {
        e.stopPropagation();
        setActionLoading(true);
        try {
            await tasksApi.cancel(task.id);
            updateTask({ ...task, user_status: undefined });
            onCancelSuccess?.();
        }
        catch { /* ignore */ }
        finally {
            setActionLoading(false);
        }
    };
    // ── Property 1=in progress (card_9) — 342×197 inline expanded ──────────────
    if (isProgress || isChecking) {
        return (_jsxs("div", { style: {
                position: 'relative',
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #EEECF9',
                marginBottom: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', padding: '12px 12px 10px 0' }, children: [_jsx(CardImage, { task: task }), _jsxs("div", { style: { flex: 1, minWidth: 0, paddingLeft: 10 }, children: [_jsx("p", { style: { fontSize: 14, fontWeight: 700, color: '#02020E', lineHeight: 1.3, marginBottom: 6 }, children: task.title }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 13, color: '#4D536D' }, children: "\u041D\u0430\u0433\u0440\u0430\u0434\u0430:" }), _jsxs("span", { style: { fontSize: 14, fontWeight: 700, color: ACCENT }, children: [parseFloat(task.reward).toFixed(0), " \u20BD"] })] }), (expiresCountdown || durationMins) && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(GreenTimerIcon, {}), _jsx("span", { style: { fontSize: 12, color: '#4D536D' }, children: expiresCountdown || `${durationMins} мин просмотра` })] }))] })] }), _jsxs("div", { style: {
                        margin: '0 12px',
                        background: '#FDF3CD',
                        borderRadius: 8,
                        padding: '8px 10px',
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginBottom: 10,
                    }, children: [_jsx(HourglassIcon, {}), _jsx("span", { style: { fontSize: 12, color: '#8B6200', lineHeight: 1.4 }, children: isChecking ? 'Проверяем выполнение задания...' : 'Задание выполняется, ожидайте проверки' })] }), _jsx("div", { style: { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }, children: isChecking ? (_jsxs(_Fragment, { children: [_jsxs("button", { disabled: true, style: {
                                    height: 42, borderRadius: 21, border: 'none',
                                    background: '#9B9FB0', color: '#fff',
                                    fontSize: 14, fontWeight: 700, cursor: 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }, children: [_jsx("div", { className: "spinner", style: { width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' } }), "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C"] }), _jsx("button", { onClick: handleCancel, disabled: actionLoading, style: {
                                    height: 42, borderRadius: 21,
                                    background: 'transparent',
                                    border: `2px solid ${ACCENT}`,
                                    color: ACCENT, fontSize: 14, fontWeight: 700,
                                    cursor: actionLoading ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleCheck, disabled: actionLoading, style: {
                                    height: 42, borderRadius: 21, border: 'none',
                                    background: actionLoading ? '#9B9FB0' : '#FA8D28',
                                    color: '#fff', fontSize: 14, fontWeight: 700,
                                    cursor: actionLoading ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }, children: actionLoading
                                    ? _jsx("div", { className: "spinner", style: { width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' } })
                                    : 'Проверить' }), _jsx("button", { onClick: handleCancel, disabled: actionLoading, style: {
                                    height: 42, borderRadius: 21,
                                    background: 'transparent',
                                    border: `2px solid ${ACCENT}`,
                                    color: ACCENT, fontSize: 14, fontWeight: 700,
                                    cursor: actionLoading ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u043D\u0438\u0435" })] })) }), isVip && _jsx(VipBadge, {})] }));
    }
    // ── Property 1=done_2 — completed card (smaller, greyed) ────────────────────
    if (isDone) {
        return (_jsx("div", { style: {
                position: 'relative',
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #EEECF9',
                marginBottom: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
            }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '8px 12px 8px 0', minHeight: 80 }, children: [_jsx(CardImage, { task: task, greyed: true }), _jsxs("div", { style: { flex: 1, minWidth: 0, paddingLeft: 10 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsx("p", { style: { fontSize: 14, fontWeight: 600, color: '#9B9FB0', lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }, children: task.title }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }, children: [_jsxs("span", { style: { fontSize: 14, fontWeight: 700, color: '#9B9FB0' }, children: [parseFloat(task.reward).toFixed(0), " \u20BD"] }), _jsx(CheckIcon, {})] })] }), _jsx("p", { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginTop: 4 }, children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D" })] })] }) }));
    }
    // ── Property 1=active_4 — new/available card (104px height) ────────────────
    // rect 342×105 rx=12 white / stroke=#EEECF9
    return (_jsxs("div", { onClick: onClick, style: {
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #EEECF9',
            marginBottom: 10,
            overflow: 'hidden',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '12px 12px 12px 0', minHeight: 80 }, children: [_jsx(CardImage, { task: task }), _jsxs("div", { style: { flex: 1, minWidth: 0, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, children: [_jsx("p", { style: { fontSize: 14, fontWeight: 700, color: '#02020E', lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }, children: task.title }), _jsxs("span", { style: { fontSize: 14, fontWeight: 800, color: ACCENT, flexShrink: 0, marginTop: 1 }, children: [parseFloat(task.reward).toFixed(0), " \u20BD"] })] }), showProgress && (_jsxs("p", { style: { fontSize: 11, color: '#4D536D', marginTop: 1 }, children: ["\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: ", todayCount, " \u0438\u0437 ", dailyLimit] })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: durationMins && (_jsxs(_Fragment, { children: [_jsx(GreenTimerIcon, {}), _jsxs("span", { style: { fontSize: 11, color: '#4D536D' }, children: [durationMins, " \u043C\u0438\u043D"] })] })) }), _jsx("button", { onClick: (e) => { e.stopPropagation(); onClick(); }, style: {
                                            width: 112, height: 40, borderRadius: 20, border: 'none',
                                            background: GRAD,
                                            color: '#fff', fontSize: 13, fontWeight: 700,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }, children: "\u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C" })] })] })] }), isVip && _jsx(VipBadge, {})] }));
}
// ─── Banner countdown — format "08 д : 08 ч : 08 м : 08 с" (from tasks.svg) ──
function useBannerCountdown(expiresAt) {
    const [txt, setTxt] = useState('');
    useEffect(() => {
        if (!expiresAt) {
            setTxt('');
            return;
        }
        const fmt = (n) => String(n).padStart(2, '0');
        const tick = () => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setTxt('');
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTxt(`${fmt(d)} д : ${fmt(h)} ч : ${fmt(m)} м : ${fmt(s)} с`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);
    return txt;
}
// ─── Single banner slide — rect 320×150 rx=12 from tasks.svg ─────────────────
function BannerSlide({ task }) {
    const navigate = useNavigate();
    const countdown = useBannerCountdown(task?.expires_at ?? null);
    const executorsLeft = task?.max_completions != null
        ? Math.max(0, task.max_completions - (task.total_completions ?? 0))
        : null;
    const budgetRubles = executorsLeft != null && task?.reward
        ? executorsLeft * parseFloat(task.reward)
        : (task?.max_completions && task?.reward
            ? task.max_completions * parseFloat(task.reward)
            : null);
    const budgetLabel = budgetRubles != null
        ? `БЮДЖЕТ ${budgetRubles.toLocaleString('ru', { maximumFractionDigits: 0 })} ₽`
        : 'ГОРЯЧЕЕ ЗАДАНИЕ';
    // По макету: одинаковые отступы сверху/снизу и между блоками (фиксированный padding + gap, без лишнего низа)
    const slideWidth = 'calc(100vw - 56px)';
    return (_jsxs("div", { onClick: () => task && navigate(`/tasks/${task.id}`), style: {
            minWidth: slideWidth,
            maxWidth: slideWidth,
            height: 150,
            borderRadius: 12,
            background: 'linear-gradient(160deg, #00C7D3 0%, #1A44C2 100%)',
            padding: '16px 18px',
            cursor: task ? 'pointer' : 'default',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            scrollSnapAlign: 'start',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            justifyContent: 'flex-start',
        }, children: [_jsx("div", { style: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(63,227,169,0.35) 0%, rgba(21,202,224,0.20) 60%, transparent 100%)', pointerEvents: 'none' } }), _jsx("p", { style: { position: 'relative', fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase', margin: 0 }, children: budgetLabel }), _jsx("p", { style: { position: 'relative', fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }, children: task?.title || 'Новые задания уже ждут вас' }), _jsx("div", { style: {
                    position: 'relative',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#EEECF9', borderRadius: 16.5,
                    padding: '5px 14px',
                    alignSelf: 'flex-start',
                }, children: countdown ? (_jsxs(_Fragment, { children: [_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.06-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z", fill: "#02020E" }) }), _jsx("span", { style: { fontSize: 13, fontWeight: 700, color: '#02020E' }, children: countdown })] })) : executorsLeft != null ? (_jsxs("span", { style: { fontSize: 13, fontWeight: 700, color: '#02020E' }, children: ["\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043C\u0435\u0441\u0442: ", executorsLeft] })) : (_jsx("span", { style: { fontSize: 13, fontWeight: 700, color: '#02020E' }, children: "\u041E\u0442\u043A\u0440\u044B\u0442\u043E" })) })] }));
}
// ─── News banner carousel — tasks.svg "banners" group ────────────────────────
function NewsBanner({ tasks }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const scrollRef = useRef(null);
    const scrollToSlide = (idx) => {
        if (!scrollRef.current)
            return;
        const el = scrollRef.current;
        // Each slide occupies (slideWidth + gap) in scroll space; gap=12
        const firstChild = el.firstChild;
        const slideWidth = firstChild ? firstChild.offsetWidth + 12 : el.clientWidth;
        el.scrollTo({ left: idx * slideWidth, behavior: 'smooth' });
    };
    // Auto-advance every 4 seconds
    useEffect(() => {
        if (tasks.length <= 1)
            return;
        const id = setInterval(() => {
            setActiveIdx((prev) => {
                const next = (prev + 1) % tasks.length;
                scrollToSlide(next);
                return next;
            });
        }, 4000);
        return () => clearInterval(id);
    }, [tasks.length]);
    const handleScroll = () => {
        if (!scrollRef.current)
            return;
        const el = scrollRef.current;
        const firstChild = el.firstChild;
        const slideWidth = firstChild ? firstChild.offsetWidth + 12 : el.clientWidth;
        const count = Math.max(tasks.length, 1);
        const idx = Math.round(el.scrollLeft / slideWidth);
        setActiveIdx(Math.max(0, Math.min(idx, count - 1)));
    };
    // Ensure at least one placeholder if no tasks
    const slides = tasks.length > 0 ? tasks : [null];
    return (_jsxs("div", { children: [_jsx("div", { ref: scrollRef, onScroll: handleScroll, style: {
                    display: 'flex', gap: 12, paddingLeft: 20, paddingRight: 20,
                    overflowX: 'auto', scrollSnapType: 'x mandatory',
                    scrollPaddingLeft: 20,
                    msOverflowStyle: 'none', scrollbarWidth: 'none',
                }, children: slides.map((task, i) => _jsx(BannerSlide, { task: task }, task?.id ?? i)) }), slides.length > 1 && (_jsx("div", { style: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, paddingBottom: 2 }, children: slides.map((_, i) => (_jsx("div", { onClick: () => {
                        setActiveIdx(i);
                        scrollToSlide(i);
                    }, style: {
                        width: i === activeIdx ? 18 : 6,
                        height: 6, borderRadius: 3,
                        background: i === activeIdx ? ACCENT : '#D1D5DB',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                    } }, i))) }))] }));
}
// ─── Main page ─────────────────────────────────────────────────────────────────
const TYPE_FILTERS = [
    { key: '', label: 'Все' },
    { key: 'subscribe', label: '📢 Подписка' },
    { key: 'like', label: '❤️ Лайк' },
];
export default function TasksPage() {
    const navigate = useNavigate();
    const { completedToday, setTasks, user } = useStore();
    const [tasks, setLocalTasks] = useState([]);
    const [tab, setTab] = useState('new');
    const [sort, setSort] = useState('default');
    const [typeFilter, setTypeFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [onlineCount, setOnlineCount] = useState(0);
    const [bannerTaskIds, setBannerTaskIds] = useState([]);
    const allTasksRef = useRef([]);
    const level = calcLevel(parseFloat(user?.total_earned ?? '0'));
    const load = useCallback(async (s, tt, p) => {
        if (p === 1) {
            allTasksRef.current = [];
            setLoading(true);
        }
        else {
            setLoadingMore(true);
        }
        try {
            const { data } = await tasksApi.list({ sort: s, task_type: tt || undefined, page: p, page_size: PAGE_SIZE });
            allTasksRef.current = p === 1 ? data.tasks : [...allTasksRef.current, ...data.tasks];
            setLocalTasks([...allTasksRef.current]);
            setTasks([...allTasksRef.current], data.completed_today);
            setPage(data.page);
            setTotalPages(data.pages);
        }
        finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [setTasks]);
    useEffect(() => { load(sort, typeFilter, 1); }, [sort, typeFilter]);
    useEffect(() => {
        settingsApi.public().then(({ data }) => {
            // banner_task_ids = JSON array "[1,2,3]" (new multi-banner)
            // banner_task_id = single ID (legacy fallback)
            if (data.banner_task_ids) {
                try {
                    const ids = JSON.parse(data.banner_task_ids);
                    if (Array.isArray(ids) && ids.length > 0) {
                        setBannerTaskIds(ids.filter((n) => typeof n === 'number' && !isNaN(n)));
                        return;
                    }
                }
                catch { /* ignore parse error */ }
            }
            const id = data.banner_task_id ? parseInt(data.banner_task_id) : null;
            if (id && !isNaN(id))
                setBannerTaskIds([id]);
        }).catch(() => { });
    }, []);
    useEffect(() => {
        const fetchOnline = () => {
            settingsApi.online().then(({ data }) => {
                if (data.online != null)
                    setOnlineCount(data.online);
            }).catch(() => { });
        };
        fetchOnline();
        const id = setInterval(fetchOnline, 60000);
        return () => clearInterval(id);
    }, []);
    // Filter by status tab
    const filtered = tasks.filter((t) => {
        if (tab === 'new')
            return !t.user_status || t.user_status === 'failed' || t.user_status === 'expired';
        if (tab === 'in_progress')
            return t.user_status === 'in_progress' || t.user_status === 'checking';
        return t.user_status === 'completed';
    });
    // Banner tasks: use admin-selected list or auto-pick up to 3 best tasks
    const bannerTasks = bannerTaskIds.length > 0
        ? bannerTaskIds.map(id => tasks.find(t => t.id === id)).filter((t) => !!t)
        : tasks
            .filter(t => !t.user_status || t.user_status === 'failed')
            .filter(t => t.expires_at || t.max_completions)
            .slice(0, 3);
    // Today's day of week (0=Sun → 6=Sat, but we want Mon=0)
    const todayIdx = (new Date().getDay() + 6) % 7;
    const progressPct = Math.min(100, (completedToday / DAILY_MAX) * 100);
    return (_jsxs("div", { className: "page", style: { background: '#F5F5F5' }, children: [_jsx(AppHeader, { title: "TASKCASH", right: _jsx("button", { onClick: () => setSort(sort === 'default' ? 'reward_desc' : 'default'), style: {
                        width: 34, height: 34, borderRadius: 17,
                        border: '1.5px solid #EEECF9',
                        background: sort !== 'default' ? ACCENT : '#fff',
                        color: sort !== 'default' ? '#fff' : '#4D536D',
                        cursor: 'pointer', fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }, children: "\u21C5" }) }), _jsxs("div", { style: { background: '#FFFFFF', borderBottom: '1px solid #E5E6EE', flexShrink: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 10px' }, children: [_jsx("div", { style: { display: 'flex', marginRight: 2 }, children: [0, 1, 2].map((i) => (_jsx("div", { style: {
                                        width: 28, height: 28, borderRadius: 14,
                                        background: `hsl(${i * 40},30%,75%)`,
                                        border: '1.5px solid #23C366',
                                        marginLeft: i === 0 ? 0 : -8,
                                        zIndex: 3 - i,
                                        overflow: 'hidden',
                                    }, children: user?.photo_url && i === 0 && (_jsx("img", { src: user.photo_url, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' }, referrerPolicy: "no-referrer" })) }, i))) }), _jsx("div", { style: { width: 8, height: 8, borderRadius: 4, background: ACCENT, flexShrink: 0 } }), _jsxs("p", { style: { fontSize: 12, color: '#9B9FB0', flex: 1 }, children: ["\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u0432 \u0441\u0435\u0442\u0438: ", _jsx("strong", { style: { color: '#02020E' }, children: onlineCount.toLocaleString() })] }), _jsxs("div", { onClick: () => navigate('/profile'), style: { display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }, children: [_jsx("span", { style: { fontSize: 13, fontWeight: 600, color: '#02020E', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Пользователь' }), _jsx("svg", { width: "6", height: "10", viewBox: "0 0 6 10", fill: "none", children: _jsx("path", { d: "M1 1L5 5L1 9", stroke: "#9B9FB0", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsx(LevelBadge, { level: level })] })] }), _jsxs("div", { style: {
                            margin: '0 16px 12px',
                            background: '#FFFFFF',
                            borderRadius: 12,
                            border: '1px solid #EEECF9',
                            boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
                            padding: '14px 16px',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }, children: [_jsx(FireIcon, {}), _jsx("span", { style: { fontSize: 14, fontWeight: 500, color: '#02020E' }, children: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" }), _jsxs("span", { style: { fontSize: 14, fontWeight: 600, color: ACCENT }, children: [completedToday, "/", DAILY_MAX] }), _jsx("span", { style: { fontSize: 14, fontWeight: 500, color: '#02020E' }, children: "\u0437\u0430\u0434\u0430\u043D\u0438\u0439" })] }), _jsx("div", { style: { height: 8, borderRadius: 4, background: '#EEECF9', overflow: 'hidden', marginBottom: 10 }, children: _jsx("div", { style: { height: '100%', width: `${progressPct}%`, borderRadius: 4, background: GRAD, transition: 'width 0.4s ease' } }) }), _jsx("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: DAYS.map((day, i) => {
                                    const isToday = i === todayIdx;
                                    const isPast = i < todayIdx;
                                    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 600, color: isToday ? '#02020E' : '#4D536D' }, children: day }), _jsx("div", { style: {
                                                    width: 22, height: 22, borderRadius: 11,
                                                    background: isPast && completedToday > 0 ? ACCENT : 'transparent',
                                                    border: `1.5px solid ${isPast && completedToday > 0 ? ACCENT : isToday ? ACCENT : '#9B9FB0'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }, children: isPast && completedToday > 0 && (_jsx("svg", { width: "10", height: "8", viewBox: "0 0 10 8", fill: "none", children: _jsx("path", { d: "M1 4L3.5 6.5L9 1", stroke: "white", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })) })] }, day));
                                }) })] })] }), _jsxs("div", { className: "scroll-area", children: [!loading && (_jsxs("div", { style: { flexShrink: 0, paddingTop: 12, paddingBottom: 4 }, children: [_jsx("p", { style: { fontSize: 14, fontWeight: 700, color: '#02020E', padding: '0 16px 10px', textTransform: 'uppercase', letterSpacing: 0.5 }, children: "\u041D\u041E\u0412\u041E\u0421\u0422\u0418 \u0421\u0415\u0420\u0412\u0418\u0421\u0410" }), _jsx(NewsBanner, { tasks: bannerTasks })] })), _jsx("div", { style: {
                            padding: '12px 16px 0',
                            flexShrink: 0,
                        }, children: _jsx("div", { style: {
                                display: 'flex',
                                background: '#F8F8FA',
                                borderRadius: 25,
                                border: '2px solid #fff',
                                boxShadow: '0 0 0 1.5px #EEECF9',
                                padding: 3,
                                gap: 2,
                            }, children: STATUS_TABS.map(({ key, label }) => (_jsx("button", { onClick: () => setTab(key), style: {
                                    flex: 1,
                                    height: 44,
                                    borderRadius: 22,
                                    border: 'none',
                                    fontSize: 13,
                                    fontWeight: tab === key ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    background: tab === key ? ACCENT : 'transparent',
                                    color: tab === key ? '#fff' : '#9B9FB0',
                                    whiteSpace: 'nowrap',
                                }, children: label }, key))) }) }), _jsx("div", { style: { flexShrink: 0, paddingTop: 10, paddingBottom: 4 }, children: _jsx("div", { style: {
                                display: 'flex', gap: 6,
                                overflowX: 'auto', paddingLeft: 16, paddingRight: 16,
                                msOverflowStyle: 'none', scrollbarWidth: 'none',
                            }, children: TYPE_FILTERS.map(({ key, label }) => (_jsx("button", { onClick: () => setTypeFilter(key), style: {
                                    flexShrink: 0,
                                    height: 32, padding: '0 14px',
                                    borderRadius: 100,
                                    border: `1.5px solid ${typeFilter === key ? ACCENT : '#EEECF9'}`,
                                    background: typeFilter === key ? ACCENT : '#fff',
                                    color: typeFilter === key ? '#fff' : '#4D536D',
                                    fontSize: 12, fontWeight: typeFilter === key ? 700 : 500,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }, children: label }, key))) }) }), _jsx("div", { style: { paddingTop: 12, paddingLeft: 16, paddingRight: 16 }, children: loading ? (_jsx("div", { className: "loader", children: _jsx("div", { className: "spinner" }) })) : filtered.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '40px 32px', color: '#9B9FB0' }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 12 }, children: { new: '🎯', in_progress: '⏳', done: '✅' }[tab] }), _jsx("p", { style: { fontSize: 15, fontWeight: 700, color: '#02020E', marginBottom: 6 }, children: typeFilter
                                        ? 'Заданий этого типа нет'
                                        : { new: 'Новых заданий нет', in_progress: 'Нет активных заданий', done: 'Нет выполненных заданий' }[tab] }), _jsx("p", { style: { fontSize: 13, color: '#9B9FB0' }, children: typeFilter
                                        ? 'Попробуйте выбрать другой тип или снимите фильтр'
                                        : { new: 'Скоро появятся новые задания', in_progress: 'Выберите задание из раздела «Новые»', done: 'Выполните задания чтобы видеть их здесь' }[tab] })] })) : (_jsxs(_Fragment, { children: [filtered.map((task) => (_jsx(TaskCardItem, { task: task, onClick: () => navigate(`/tasks/${task.id}`), onCancelSuccess: () => load(sort, typeFilter, 1) }, task.id))), page < totalPages && (_jsx("div", { style: { textAlign: 'center', padding: '8px 0 4px' }, children: _jsx("button", { onClick: () => load(sort, typeFilter, page + 1), disabled: loadingMore, style: {
                                            padding: '9px 28px', borderRadius: 100,
                                            border: `1.5px solid ${ACCENT}`, background: 'none', color: ACCENT,
                                            fontWeight: 600, fontSize: 13, cursor: loadingMore ? 'default' : 'pointer',
                                            opacity: loadingMore ? 0.6 : 1,
                                        }, children: loadingMore ? 'Загрузка...' : 'Загрузить ещё' }) })), _jsx("div", { style: { height: 16 } })] })) })] })] }));
}
