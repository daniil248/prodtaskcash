import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
let addToastFn = null;
export const showToast = (message, type = 'default') => {
    addToastFn?.(message, type);
};
export default function Toast() {
    const [toasts, setToasts] = useState([]);
    useEffect(() => {
        addToastFn = (message, type = 'default') => {
            const id = Date.now();
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
        };
        return () => { addToastFn = null; };
    }, []);
    return (_jsx("div", { className: "toast-container", children: toasts.map((t) => (_jsx("div", { className: `toast toast-${t.type}`, children: t.message }, t.id))) }));
}
