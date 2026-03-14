import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { adminApi } from '../api';
const TYPES = [
    { value: 'text', label: 'Только текст' },
    { value: 'photo', label: 'Фото (JPEG, PNG, HEIC)' },
    { value: 'document', label: 'Документ (PDF, HEIC и др.)' },
    { value: 'video', label: 'Видео' },
    { value: 'animation', label: 'GIF' },
];
export default function BroadcastPage() {
    const [messageType, setMessageType] = useState('text');
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (messageType !== 'text' && !file) {
            setResult('Для рассылки с медиа выберите файл.');
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const form = new FormData();
            form.append('message_type', messageType);
            form.append('text', text);
            if (file)
                form.append('file', file);
            await adminApi.broadcast(form);
            setResult('Рассылка запущена. Сообщения отправляются всем пользователям пользовательского бота.');
            setText('');
            setFile(null);
        }
        catch (err) {
            const msg = err?.response?.data?.detail ?? 'Ошибка';
            setResult(`Ошибка: ${msg}`);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "\uD83D\uDCE2 \u0420\u0430\u0441\u0441\u044B\u043B\u043A\u0430" }), _jsx("p", { style: { color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }, children: "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0432\u0441\u0435\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0433\u043E \u0431\u043E\u0442\u0430. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: \u0442\u0435\u043A\u0441\u0442, JPEG/PNG/HEIC (\u0444\u043E\u0442\u043E), PDF/HEIC (\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442), \u0432\u0438\u0434\u0435\u043E, GIF." }), _jsxs("form", { onSubmit: handleSubmit, className: "card", style: { maxWidth: 520 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0422\u0438\u043F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F" }), _jsx("select", { value: messageType, onChange: (e) => { setMessageType(e.target.value); setFile(null); }, style: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }, children: TYPES.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0422\u0435\u043A\u0441\u0442 (\u043F\u043E\u0434\u043F\u0438\u0441\u044C \u043A \u043C\u0435\u0434\u0438\u0430 \u0438\u043B\u0438 \u043F\u0440\u043E\u0441\u0442\u043E \u0442\u0435\u043A\u0441\u0442)" }), _jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F...", rows: 4, style: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical' } })] }), messageType !== 'text' && (_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0424\u0430\u0439\u043B" }), _jsx("input", { type: "file", accept: messageType === 'photo' ? 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic' :
                                    messageType === 'document' ? '.pdf,.heic,.heif,application/pdf,image/heic' :
                                        messageType === 'video' ? 'video/*' :
                                            'image/gif,.gif', onChange: (e) => setFile(e.target.files?.[0] ?? null), style: { fontSize: 14 } })] })), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, style: { marginTop: 8 }, children: loading ? 'Отправка...' : 'Запустить рассылку' }), result && (_jsx("p", { style: { marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 14 }, children: result }))] })] }));
}
