import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// SVG-extracted: exact brand gradient from components.svg
const GRAD = 'linear-gradient(135deg, #35DE66 43%, #2CE1A1 58%, #02BBC7 100%)';
// Type icon paths from SVG (task_subscribtion.svg, task_like.svg, task_ADS.svg)
const TYPE_COLORS = {
    subscribe: '#1A44C2',
    like: '#FE5A5B',
    watch_ad: '#FA8D28',
    invite: '#23C366',
};
const TYPE_LABELS = {
    subscribe: 'Подписка',
    like: 'Лайк',
    watch_ad: 'Реклама',
    invite: 'Приглашение',
};
// SVG icon paths extracted directly from task_subscribtion.svg / task_like.svg / task_ADS.svg
function TypeIcon({ type }) {
    const color = TYPE_COLORS[type] || '#9B9FB0';
    if (type === 'subscribe') {
        // Telegram channel / subscribe icon
        return (_jsxs("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", children: [_jsx("circle", { cx: "14", cy: "14", r: "14", fill: "#EDF5FF" }), _jsx("path", { d: "M7 14.5L11.5 19L21 9", stroke: color, strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
    }
    if (type === 'like') {
        // Heart icon
        return (_jsxs("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", children: [_jsx("circle", { cx: "14", cy: "14", r: "14", fill: "#FFEDED" }), _jsx("path", { d: "M14 20s-7-4.35-7-8.5A4.5 4.5 0 0 1 14 9.1 4.5 4.5 0 0 1 21 11.5C21 15.65 14 20 14 20Z", fill: color })] }));
    }
    if (type === 'watch_ad') {
        // Play circle icon
        return (_jsxs("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", children: [_jsx("circle", { cx: "14", cy: "14", r: "14", fill: "#FFF3E0" }), _jsx("path", { d: "M11 10l9 4-9 4V10Z", fill: color })] }));
    }
    // invite
    return (_jsxs("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", children: [_jsx("circle", { cx: "14", cy: "14", r: "14", fill: "#E2F3EE" }), _jsx("path", { d: "M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 22v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M23 8v6M20 11h6", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
const STATUS_LABELS = {
    in_progress: 'В процессе',
    checking: 'Проверка…',
    completed: 'Выполнено ✓',
    failed: 'Не выполнено',
    expired: 'Истекло',
};
export default function TaskCard({ task, onClick }) {
    const isDone = task.user_status === 'completed';
    const isChecking = task.user_status === 'checking';
    const isActive = task.user_status === 'in_progress';
    // Completion progress for the progress bar (0–100)
    const progress = task.max_completions && task.total_completions
        ? Math.min(100, (task.total_completions / task.max_completions) * 100)
        : 0;
    return (_jsxs("div", { onClick: isDone ? undefined : onClick, style: {
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #EEECF9',
            marginBottom: 10,
            overflow: 'hidden',
            opacity: isDone ? 0.7 : 1,
            cursor: isDone ? 'default' : 'pointer',
            transition: 'transform 0.1s',
            boxShadow: '0 2px 8px rgba(2,2,14,0.04)',
        }, onTouchStart: (e) => { if (!isDone)
            (e.currentTarget.style.transform = 'scale(0.985)'); }, onTouchEnd: (e) => { (e.currentTarget.style.transform = 'scale(1)'); }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 12px 10px',
                    gap: 12,
                    minHeight: 82,
                }, children: [_jsx("div", { style: {
                            width: 60,
                            height: 60,
                            borderRadius: 12,
                            background: '#F8F8FA',
                            border: '1px solid #EEECF9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            overflow: 'hidden',
                        }, children: task.icon_url
                            ? _jsx("img", { src: task.icon_url, alt: "", style: { width: 44, height: 44, borderRadius: 8, objectFit: 'cover' } })
                            : _jsx(TypeIcon, { type: task.task_type }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }, children: [_jsx("span", { style: {
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: TYPE_COLORS[task.task_type] || '#9B9FB0',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.3,
                                        }, children: TYPE_LABELS[task.task_type] || task.task_type }), task.user_status && task.user_status !== 'completed' && (_jsx("span", { style: {
                                            fontSize: 10,
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: 100,
                                            background: isChecking ? '#FDF3CD' : isActive ? '#EDF5FF' : '#F8F8FA',
                                            color: isChecking ? '#8B6200' : isActive ? '#1A44C2' : '#9B9FB0',
                                        }, children: STATUS_LABELS[task.user_status] })), isDone && (_jsx("span", { style: { fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: '#E2F3EE', color: '#047935' }, children: STATUS_LABELS.completed }))] }), _jsx("p", { style: {
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#02020E',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                }, children: task.title }), task.duration_seconds && !isDone && (_jsxs("p", { style: { fontSize: 11, color: '#9B9FB0', marginTop: 3 }, children: ["\u23F1 ", task.duration_seconds, "\u0441 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430"] }))] }), _jsx("div", { style: { flexShrink: 0 }, children: isDone ? (_jsx("div", { style: {
                                width: 80,
                                height: 36,
                                borderRadius: 18,
                                background: '#E2F3EE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#047935',
                            }, children: "\u2713 \u0413\u043E\u0442\u043E\u0432\u043E" })) : (_jsxs("div", { style: {
                                width: 94,
                                height: 40,
                                borderRadius: 20,
                                background: GRAD,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 15,
                                fontWeight: 800,
                                color: '#fff',
                                letterSpacing: '-0.2px',
                            }, children: ["+", parseFloat(task.reward).toFixed(0), "\u20BD"] })) })] }), (progress > 0 || task.max_completions) && (_jsxs("div", { style: { padding: '0 12px 10px' }, children: [_jsx("div", { style: { height: 6, borderRadius: 3, background: '#EEECF9', overflow: 'hidden' }, children: progress > 0 && (_jsx("div", { style: {
                                height: '100%',
                                width: `${progress}%`,
                                borderRadius: 3,
                                background: GRAD,
                                transition: 'width 0.3s',
                            } })) }), task.max_completions && (_jsxs("p", { style: { fontSize: 10, color: '#9B9FB0', marginTop: 3, textAlign: 'right' }, children: [task.total_completions ?? 0, "/", task.max_completions, " \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0439"] }))] }))] }));
}
