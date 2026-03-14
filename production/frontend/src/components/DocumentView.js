import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const C = {
    bg: '#F5F5F5',
    text: '#2B2A2E',
    muted: '#4D536D',
    border: '#E5E5EA',
    accent: '#23C366',
};
export default function DocumentView({ document: doc, onClose, backLabel = 'Назад' }) {
    return (_jsxs("div", { style: {
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100dvh',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
        }, children: [_jsxs("header", { style: {
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: `1px solid ${C.border}`,
                }, children: [_jsx("button", { type: "button", onClick: onClose, style: {
                            background: 'none',
                            border: 'none',
                            padding: '12px 16px',
                            minWidth: 44,
                            minHeight: 44,
                            font: 'inherit',
                            fontSize: 15,
                            color: C.accent,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: backLabel }), _jsx("span", { style: { fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: 700, color: C.text, maxWidth: '60%', textAlign: 'center' }, children: doc.title }), _jsx("span", { style: { width: 60, display: 'inline-block' } })] }), _jsx("div", { style: {
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    padding: '16px',
                }, children: _jsx("pre", { style: {
                        fontFamily: 'inherit',
                        fontSize: 'clamp(13px, 3vw, 15px)',
                        color: C.text,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                    }, children: doc.content }) })] }));
}
