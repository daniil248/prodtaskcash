import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Chevron (стрелка вниз) из components.svg — Right Accessory ion:chevron-back */
function ChevronDownIcon() {
    return (_jsx("svg", { width: "14", height: "10", viewBox: "0 0 14 10", fill: "none", style: { display: 'block' }, children: _jsx("path", { d: "M1.25 1.625L7 7.375L12.75 1.625", stroke: "#02020E", strokeWidth: "2.25", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
/** Шапка по components.svg: Top Navigation — белая полоса, граница #E5E6EE, контент по центру */
export default function AppHeader({ title, showBack, onBack, right, }) {
    return (_jsx("header", { style: {
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E6EE',
            flexShrink: 0,
            paddingTop: 'env(safe-area-inset-top, 0px)',
        }, children: _jsxs("div", { style: {
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                position: 'relative',
            }, children: [_jsx("div", { style: { minWidth: 80, display: 'flex', alignItems: 'center' }, children: showBack && onBack ? (_jsxs("button", { type: "button", onClick: onBack, "aria-label": "\u041D\u0430\u0437\u0430\u0434", style: {
                            background: 'none',
                            border: 'none',
                            padding: '8px 0',
                            fontSize: 16,
                            fontWeight: 500,
                            color: '#02020E',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }, children: [_jsx("svg", { width: "8", height: "14", viewBox: "0 0 8 14", fill: "none", children: _jsx("path", { d: "M7 1L1 7L7 13", stroke: "#02020E", strokeWidth: "2.25", strokeLinecap: "round", strokeLinejoin: "round" }) }), "\u041D\u0430\u0437\u0430\u0434"] })) : null }), _jsx("h1", { style: {
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#02020E',
                        letterSpacing: 0.5,
                        textAlign: 'center',
                        pointerEvents: 'none',
                    }, children: title }), _jsx("div", { style: { minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }, children: right !== undefined ? right : _jsx(ChevronDownIcon, {}) })] }) }));
}
