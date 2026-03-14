import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { profileApi } from './api/client';
import SplashPage from './pages/SplashPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import BonusesPage from './pages/BonusesPage';
import ProfilePage from './pages/ProfilePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
function PrivateLayout({ children }) {
    const { token } = useStore();
    if (!token)
        return _jsx(Navigate, { to: "/", replace: true });
    return (_jsxs(_Fragment, { children: [children, _jsx(BottomNav, {})] }));
}
export default function App() {
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            const tgAny = tg;
            tgAny.requestFullscreen?.();
        }
    }, []);
    useEffect(() => {
        const refresh = () => {
            if (!useStore.getState().token)
                return;
            profileApi.get().then(({ data }) => {
                // Не перезаписывать профиль пустым/невалидным ответом (сбой прокси, пустое тело и т.д.)
                const d = data;
                if (!d || (d.id == null && !d.telegram_id))
                    return;
                const state = useStore.getState();
                const mergedUser = { ...state.user, ...data, photo_url: data.photo_url ?? state.user?.photo_url ?? null };
                state.setUser(mergedUser);
                state.setProfile(data);
            }).catch(() => { });
        };
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.onEvent('activated', refresh);
            return () => tg.offEvent('activated', refresh);
        }
        const onVisible = () => { if (document.visibilityState === 'visible')
            refresh(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);
    return (_jsxs(BrowserRouter, { children: [_jsx(Toast, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(SplashPage, {}) }), _jsx(Route, { path: "/tasks", element: _jsx(PrivateLayout, { children: _jsx(TasksPage, {}) }) }), _jsx(Route, { path: "/tasks/:id", element: _jsx(PrivateLayout, { children: _jsx(TaskDetailPage, {}) }) }), _jsx(Route, { path: "/bonuses", element: _jsx(PrivateLayout, { children: _jsx(BonusesPage, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(PrivateLayout, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "/profile/settings", element: _jsx(PrivateLayout, { children: _jsx(ProfileSettingsPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] })] }));
}
