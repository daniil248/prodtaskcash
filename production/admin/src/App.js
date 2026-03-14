import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksAdminPage from './pages/TasksAdminPage';
import UsersPage from './pages/UsersPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import BlacklistPage from './pages/BlacklistPage';
import SettingsPage from './pages/SettingsPage';
import BroadcastPage from './pages/BroadcastPage';
import './styles.css';
const NAV = [
    { path: '/dashboard', label: '📊 Дашборд' },
    { path: '/tasks', label: '✅ Задания' },
    { path: '/users', label: '👤 Пользователи' },
    { path: '/withdrawals', label: '💸 Выводы' },
    { path: '/broadcast', label: '📢 Рассылка' },
    { path: '/blacklist', label: '🚫 Чёрный список' },
    { path: '/settings', label: '⚙️ Настройки' },
];
function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const logout = () => {
        localStorage.removeItem('admin_token');
        window.location.reload();
    };
    const close = () => setSidebarOpen(false);
    return (_jsxs("div", { className: "layout", children: [_jsx("div", { className: `sidebar-backdrop${sidebarOpen ? ' open' : ''}`, onClick: close }), _jsxs("aside", { className: `sidebar${sidebarOpen ? ' open' : ''}`, children: [_jsxs("div", { className: "sidebar-logo", children: [_jsx("span", { children: "TaskCash Admin" }), _jsx("button", { className: "sidebar-close-btn", onClick: close, "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", children: "\u2715" })] }), _jsx("nav", { className: "sidebar-nav", children: NAV.map((n) => (_jsx(NavLink, { to: n.path, className: ({ isActive }) => `nav-item${isActive ? ' active' : ''}`, onClick: close, children: n.label }, n.path))) }), _jsx("div", { style: { padding: '16px 10px', borderTop: '1px solid var(--border)' }, children: _jsx("button", { className: "nav-item", onClick: logout, style: { color: '#FE5A5B' }, children: "\uD83D\uDEAA \u0412\u044B\u0439\u0442\u0438" }) })] }), _jsxs("div", { className: "content-wrapper", children: [_jsxs("header", { className: "mobile-header", children: [_jsxs("button", { className: "hamburger-btn", onClick: () => setSidebarOpen(true), "aria-label": "\u041C\u0435\u043D\u044E", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsxs("span", { className: "mobile-logo", children: ["Task", _jsx("span", { children: "Cash" }), " Admin"] })] }), _jsx("main", { className: "main", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/tasks", element: _jsx(TasksAdminPage, {}) }), _jsx(Route, { path: "/users", element: _jsx(UsersPage, {}) }), _jsx(Route, { path: "/withdrawals", element: _jsx(WithdrawalsPage, {}) }), _jsx(Route, { path: "/broadcast", element: _jsx(BroadcastPage, {}) }), _jsx(Route, { path: "/blacklist", element: _jsx(BlacklistPage, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) })] })] }));
}
export default function App() {
    const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'));
    useEffect(() => {
        // Fallback fullscreen call after React mounts (index.html handles the immediate call)
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            tg.requestFullscreen?.();
        }
    }, []);
    if (!authed) {
        return _jsx(LoginPage, { onLogin: () => setAuthed(true) });
    }
    return (_jsx(BrowserRouter, { children: _jsx(AdminLayout, {}) }));
}
