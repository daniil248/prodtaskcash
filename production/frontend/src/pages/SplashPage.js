import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, settingsApi } from '../api/client';
import { useStore } from '../store';
import { DOCUMENTS, getDocumentById } from '../documents';
import DocumentView from '../components/DocumentView';
const TERMS_KEY = 'tc_terms_accepted';
const POLL_INTERVAL_MS = 150;
const MAX_WAIT_MS = 6000;
const FALLBACK_BOT_URL = 'https://t.me/test_zadaniya_bot';
const ICON_DISPLAY_MS = 800;
// Градиент загрузки: зелёный → голубой (как на скрине), на весь экран с любого устройства
const loadingGradientBg = 'linear-gradient(90deg, #23C366 0%, #1AAB57 35%, #0FA3B0 70%, #13A8F5 100%)';
// Полный экран: градиент или нейтральный фон
const fullScreenContainer = {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    minHeight: '100dvh',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F5F5',
    padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
};
// Надпись TaskCash: на градиенте — белый + зелёный градиент; на светлом фоне — тёмный + зелёный. Тень на буквах.
const TaskCashLogo = ({ size = 'clamp(2.5rem, 12vw, 4rem)', variant = 'gradient' }) => {
    const isLight = variant === 'light';
    const taskColor = isLight ? '#02020E' : '#FFFFFF';
    const shadow = isLight ? '0 2px 8px rgba(0,0,0,0.12)' : '0 4px 14px rgba(0,0,0,0.4)';
    return (_jsxs("div", { style: { display: 'flex', gap: 4, alignItems: 'baseline', justifyContent: 'center', flexWrap: 'nowrap', filter: `drop-shadow(${shadow})` }, children: [_jsx("span", { style: { fontSize: size, fontWeight: 800, color: taskColor, letterSpacing: '-0.02em', lineHeight: 1 }, children: "Task" }), _jsx("span", { style: { fontSize: size, fontWeight: 800, background: isLight ? 'linear-gradient(135deg, #1AAB57 0%, #047935 100%)' : 'linear-gradient(135deg, #DFFD57 0%, #7CFE1E 50%, #047935 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em', lineHeight: 1 }, children: "Cash" })] }));
};
// Адаптивный контейнер для экранов приветствия и условий
const responsiveContainer = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: '100dvh',
    padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F5F5',
};
export default function SplashPage() {
    const navigate = useNavigate();
    const { setAuth, token } = useStore();
    const [termsAccepted, setTermsAccepted] = useState(() => !!localStorage.getItem(TERMS_KEY));
    const [view, setView] = useState(() => localStorage.getItem(TERMS_KEY) ? 'loading' : 'icon');
    const [botUrl, setBotUrl] = useState(FALLBACK_BOT_URL);
    const [acceptedChecks, setAcceptedChecks] = useState(() => [true, true, true]);
    const [openDocId, setOpenDocId] = useState(null);
    const doneRef = useRef(false);
    const sdkReadyCalledRef = useRef(false);
    const lastTgRef = useRef(null);
    useEffect(() => {
        if (termsAccepted)
            return;
        if (view === 'icon') {
            const t = setTimeout(() => setView('welcome'), ICON_DISPLAY_MS);
            return () => clearTimeout(t);
        }
    }, [termsAccepted, view]);
    const goToTerms = () => setView('terms');
    const acceptTerms = () => {
        localStorage.setItem(TERMS_KEY, '1');
        setTermsAccepted(true);
        setView('loading');
    };
    useEffect(() => {
        if (!termsAccepted)
            return;
        const urlParams = new URLSearchParams(window.location.search);
        const urlReferralCode = urlParams.get('startapp') || urlParams.get('start_param') || null;
        const REFKEY = 'tc_pending_ref';
        if (urlReferralCode)
            localStorage.setItem(REFKEY, urlReferralCode);
        const storedRef = localStorage.getItem(REFKEY);
        const getFingerprint = () => {
            const parts = [navigator.userAgent, window.screen.width + 'x' + window.screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language, String(navigator.hardwareConcurrency || '')];
            return btoa(parts.join('|')).slice(0, 64);
        };
        const applyTheme = (tg) => {
            if (tg.colorScheme === 'dark') {
                document.documentElement.style.setProperty('--bg', '#1c1c1e');
                document.documentElement.style.setProperty('--text-primary', '#ffffff');
            }
        };
        const doAuth = async (initData, tg) => {
            if (doneRef.current)
                return;
            doneRef.current = true;
            if (!initData && token) {
                navigate('/tasks', { replace: true });
                return;
            }
            const referralCode = tg?.initDataUnsafe?.start_param ?? urlReferralCode ?? storedRef ?? undefined;
            try {
                const { data } = await authApi.telegram(initData, referralCode, getFingerprint());
                localStorage.removeItem(REFKEY);
                const photoUrl = data.user.photo_url || tg?.initDataUnsafe?.user?.photo_url || null;
                setAuth(data.access_token, { ...data.user, photo_url: photoUrl });
                navigate('/tasks', { replace: true });
            }
            catch {
                if (token) {
                    navigate('/tasks', { replace: true });
                    return;
                }
                setView('auth_error');
            }
        };
        let elapsed = 0;
        const poll = setInterval(() => {
            const tg = window.Telegram?.WebApp ?? null;
            if (tg && !sdkReadyCalledRef.current) {
                sdkReadyCalledRef.current = true;
                tg.ready();
                tg.expand();
                applyTheme(tg);
                lastTgRef.current = tg;
            }
            const initData = tg?.initData || '';
            if (initData) {
                clearInterval(poll);
                doAuth(initData, tg);
                return;
            }
            elapsed += POLL_INTERVAL_MS;
            if (elapsed >= MAX_WAIT_MS) {
                clearInterval(poll);
                if (window.Telegram?.WebApp) {
                    token ? doAuth('', lastTgRef.current) : setView('sdk_error');
                }
                else {
                    settingsApi.public().then(({ data: pub }) => { const name = pub?.bot_username; if (name)
                        setBotUrl(`https://t.me/${name}`); }).catch(() => { });
                    setView('not_in_telegram');
                }
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(poll);
    }, [termsAccepted, navigate, token]);
    const openInTelegram = () => { const tg = window.Telegram?.WebApp; if (tg)
        tg.openTelegramLink(botUrl);
    else
        window.open(botUrl, '_blank'); };
    const retryAuth = () => { doneRef.current = false; sdkReadyCalledRef.current = false; setView('loading'); window.location.reload(); };
    const btnBase = { padding: '14px 28px', minHeight: 48, border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 'clamp(14px, 4vw, 16px)', cursor: 'pointer', width: '100%', maxWidth: 343 };
    const wrapStyle = { ...responsiveContainer, background: 'linear-gradient(160deg, #23C366 0%, #047935 100%)', gap: 20, textAlign: 'center' };
    // ——— 1) Экран загрузки: градиент зелёный→голубой на весь экран, по центру надпись TaskCash (как на скрине 2) ———
    if (view === 'icon') {
        return (_jsx("div", { style: { ...fullScreenContainer, background: loadingGradientBg }, children: _jsx(TaskCashLogo, { size: "clamp(2.8rem, 14vw, 5rem)" }) }));
    }
    // ——— 2) Экран приветствия: лого с тенью, кликабельные «условия использования», под ними кнопка ———
    if (view === 'welcome') {
        return (_jsxs("div", { style: { ...responsiveContainer, justifyContent: 'space-between', paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }, children: [_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 400 }, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsx(TaskCashLogo, { size: "clamp(32px, 10vw, 48px)", variant: "light" }) }), _jsx("p", { style: { fontSize: 'clamp(18px, 4.5vw, 20px)', fontWeight: 600, color: '#02020E', marginBottom: 12 }, children: "\u0417\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0439\u0442\u0435" }), _jsx("div", { style: { padding: '10px 24px', borderRadius: 21, background: 'linear-gradient(90deg, #23C366 0%, #1AAB57 100%)', marginBottom: 24 }, children: _jsx("span", { style: { fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 600, color: '#fff' }, children: "\u041D\u0430 \u043F\u0440\u043E\u0441\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u043D\u0438\u044F\u0445" }) })] }), _jsxs("div", { style: { width: '100%', maxWidth: 343, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, children: [_jsxs("p", { style: { fontSize: 'clamp(12px, 2.8vw, 14px)', color: '#4D536D', lineHeight: 1.4, maxWidth: 320, textAlign: 'center', margin: 0 }, children: ["\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044F, \u0432\u044B \u0441\u043E\u0433\u043B\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044C \u0441", ' ', _jsx("button", { type: "button", onClick: goToTerms, style: { background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#23C366', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }, children: "\u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u0441\u0435\u0440\u0432\u0438\u0441\u0430" }), "."] }), _jsx("button", { type: "button", onClick: goToTerms, style: { ...btnBase, background: '#02020E', color: '#fff', border: '2px solid #23C366' }, children: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C" }), _jsx("span", { style: { fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#8E8E93' }, children: "\u00A9 2026 TaskCash" })] })] }));
    }
    // ——— 3) Экран условий: 3 документа с галочками (по умолчанию стоят) и ссылками; по клику — просмотр документа ———
    const goBack = () => setView('welcome');
    const toggleCheck = (index) => {
        setAcceptedChecks((prev) => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };
    const allAccepted = acceptedChecks.every(Boolean);
    const openDoc = openDocId ? getDocumentById(openDocId) : null;
    if (view === 'terms') {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { ...responsiveContainer, background: '#fff', paddingTop: 0, paddingBottom: 'max(24px, env(safe-area-inset-bottom))', justifyContent: 'flex-start', alignItems: 'stretch', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }, children: [_jsxs("header", { style: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', borderBottom: '1px solid #E5E5EA' }, children: [_jsx("button", { type: "button", onClick: goBack, style: { background: 'none', border: 'none', padding: '10px 12px', minWidth: 44, minHeight: 44, font: 'inherit', fontSize: 15, color: '#3A3A3C', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: "\u041D\u0430\u0437\u0430\u0434" }), _jsx("span", { style: { fontSize: 15, fontWeight: 700, color: '#1C1C1E', letterSpacing: '0.02em' }, children: "TASKCASH" }), _jsx("span", { style: { width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93' }, children: "\u25BE" })] }), _jsx("h1", { style: { fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: 700, color: '#1C1C1E', margin: '16px 16px 8px', textAlign: 'center', flexShrink: 0 }, children: "\u0423\u0421\u041B\u041E\u0412\u0418\u042F \u0418\u0421\u041F\u041E\u041B\u042C\u0417\u041E\u0412\u0410\u041D\u0418\u042F \u0421\u0415\u0420\u0412\u0418\u0421\u0410" }), _jsx("p", { style: { fontSize: 12, color: '#8E8E93', textAlign: 'center', margin: '0 16px 16px', flexShrink: 0 }, children: "\u041E\u0437\u043D\u0430\u043A\u043E\u043C\u044C\u0442\u0435\u0441\u044C \u0441 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438 \u0438 \u043E\u0442\u043C\u0435\u0442\u044C\u0442\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u0435" }), _jsx("div", { style: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: 400, margin: '0 auto', padding: '0 16px 16px' }, children: DOCUMENTS.map((doc, index) => (_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    minHeight: 48,
                                    padding: '12px 0',
                                    borderBottom: index < DOCUMENTS.length - 1 ? '1px solid #E5E5EA' : 'none',
                                }, children: [_jsx("button", { type: "button", onClick: () => toggleCheck(index), "aria-checked": acceptedChecks[index], style: {
                                            flexShrink: 0,
                                            width: 24,
                                            height: 24,
                                            padding: 10,
                                            margin: -10,
                                            borderRadius: 6,
                                            border: `2px solid ${acceptedChecks[index] ? '#23C366' : '#C7C7CC'}`,
                                            background: acceptedChecks[index] ? '#23C366' : 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }, children: acceptedChecks[index] && (_jsx("svg", { width: 14, height: 10, viewBox: "0 0 14 10", fill: "none", style: { pointerEvents: 'none' }, children: _jsx("path", { d: "M1 5l4 4 8-8", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }) })) }), _jsx("button", { type: "button", onClick: () => setOpenDocId(doc.id), style: {
                                            flex: 1,
                                            background: 'none',
                                            border: 'none',
                                            padding: '10px 0',
                                            minHeight: 44,
                                            font: 'inherit',
                                            fontSize: 'clamp(13px, 3.5vw, 15px)',
                                            fontWeight: 600,
                                            color: '#23C366',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }, children: doc.title })] }, doc.id))) }), _jsx("div", { style: { flexShrink: 0, padding: '16px 16px max(16px, env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center' }, children: _jsx("button", { type: "button", onClick: acceptTerms, disabled: !allAccepted, style: {
                                    ...btnBase,
                                    background: allAccepted ? 'linear-gradient(90deg, #23C366 0%, #1AAB57 100%)' : '#C7C7CC',
                                    color: '#fff',
                                    boxShadow: allAccepted ? '0 4px 14px rgba(35,195,102,0.4)' : 'none',
                                    cursor: allAccepted ? 'pointer' : 'not-allowed',
                                }, children: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C" }) })] }), openDoc && (_jsx(DocumentView, { document: openDoc, onClose: () => setOpenDocId(null), backLabel: "\u041D\u0430\u0437\u0430\u0434" }))] }));
    }
    // ——— 4) Загрузка: тот же градиент на весь экран, по центру TaskCash + спиннер ———
    if (view === 'loading') {
        return (_jsx("div", { style: { ...fullScreenContainer, background: loadingGradientBg }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }, children: [_jsx(TaskCashLogo, { size: "clamp(2.8rem, 14vw, 5rem)" }), _jsx("div", { className: "spinner", style: { borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)', width: 36, height: 36 } })] }) }));
    }
    // ——— Ошибки: градиент + лого + текст + кнопки ———
    if (view === 'not_in_telegram') {
        return (_jsxs("div", { style: wrapStyle, children: [_jsx(TaskCashLogo, { size: "clamp(1.8rem, 8vw, 2.5rem)" }), _jsx("p", { style: { marginTop: 8, color: '#fff', opacity: 0.9, fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.5, textAlign: 'center' }, children: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 Telegram-\u0431\u043E\u0442" }), _jsx("button", { type: "button", onClick: openInTelegram, style: { ...btnBase, background: '#fff', color: '#047935' }, children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 Telegram" })] }));
    }
    if (view === 'auth_error') {
        return (_jsxs("div", { style: wrapStyle, children: [_jsx(TaskCashLogo, { size: "clamp(1.8rem, 8vw, 2.5rem)" }), _jsx("p", { style: { marginTop: 8, color: '#fff', opacity: 0.9, fontSize: 'clamp(13px, 3.5vw, 15px)', textAlign: 'center' }, children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442." }), _jsx("button", { type: "button", onClick: retryAuth, style: { ...btnBase, background: '#fff', color: '#047935' }, children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] }));
    }
    if (view === 'sdk_error') {
        return (_jsxs("div", { style: wrapStyle, children: [_jsx(TaskCashLogo, { size: "clamp(1.8rem, 8vw, 2.5rem)" }), _jsx("p", { style: { marginTop: 8, color: '#fff', opacity: 0.9, fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.5, textAlign: 'center' }, children: "\u0412\u0430\u0448\u0430 \u0432\u0435\u0440\u0441\u0438\u044F Telegram \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u0434\u0430\u043D\u043D\u044B\u0435. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 \u0431\u043E\u0442." }), _jsx("button", { type: "button", onClick: openInTelegram, style: { ...btnBase, background: '#fff', color: '#047935' }, children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u0435\u0437 \u0431\u043E\u0442" }), _jsx("button", { type: "button", onClick: retryAuth, style: { ...btnBase, background: 'rgba(255,255,255,0.2)', color: '#fff', marginTop: 8 }, children: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430" })] }));
    }
    return (_jsx("div", { style: { ...fullScreenContainer, background: loadingGradientBg }, children: _jsx(TaskCashLogo, { size: "clamp(2.8rem, 14vw, 5rem)" }) }));
}
