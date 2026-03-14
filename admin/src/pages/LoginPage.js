import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { adminApi } from '../api';
export default function LoginPage({ onLogin }) {
    const [secret, setSecret] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await adminApi.login(secret);
            localStorage.setItem('admin_token', data.access_token);
            onLogin();
        }
        catch {
            setError('Неверный секретный ключ');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { style: {
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F5F5F5',
        }, children: _jsxs("div", { style: { background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 800, color: '#23C366', marginBottom: 8 }, children: "TaskCash" }), _jsx("p", { style: { color: '#9B9FB0', marginBottom: 28, fontSize: 14 }, children: "\u041F\u0430\u043D\u0435\u043B\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "\u0421\u0435\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447" }), _jsx("input", { type: "password", value: secret, onChange: (e) => setSecret(e.target.value), placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 ADMIN_SECRET", autoFocus: true })] }), error && _jsx("p", { style: { color: '#FE5A5B', fontSize: 13, marginBottom: 12 }, children: error }), _jsx("button", { type: "submit", className: "btn btn-primary", style: { width: '100%', padding: '12px' }, disabled: loading, children: loading ? 'Вход...' : 'Войти' })] })] }) }));
}
