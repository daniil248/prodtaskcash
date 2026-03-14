import { ReactNode } from 'react'

/** Chevron (стрелка вниз) из components.svg — Right Accessory ion:chevron-back */
function ChevronDownIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block' }}>
      <path
        d="M1.25 1.625L7 7.375L12.75 1.625"
        stroke="#02020E"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Шапка по components.svg: Top Navigation — белая полоса, граница #E5E6EE, контент по центру */
export default function AppHeader({
  title,
  showBack,
  onBack,
  right,
}: {
  title: string
  showBack?: boolean
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E6EE',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'relative',
        }}
      >
        {/* Left: back or placeholder for centering title */}
        <div style={{ minWidth: 80, display: 'flex', alignItems: 'center' }}>
          {showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Назад"
              style={{
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
              }}
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path
                  d="M7 1L1 7L7 13"
                  stroke="#02020E"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Назад
            </button>
          ) : null}
        </div>

        {/* Center: title — как в Figma, жирный, #02020E */}
        <h1
          style={{
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
          }}
        >
          {title}
        </h1>

        {/* Right: chevron from SVG or custom */}
        <div style={{ minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {right !== undefined ? right : <ChevronDownIcon />}
        </div>
      </div>
    </header>
  )
}
