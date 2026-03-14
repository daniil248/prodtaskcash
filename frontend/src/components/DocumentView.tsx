import type { LegalDocument } from '../documents'

const C = {
  bg: '#F5F5F5',
  text: '#2B2A2E',
  muted: '#4D536D',
  border: '#E5E5EA',
  accent: '#23C366',
}

type Props = {
  document: LegalDocument
  onClose: () => void
  /** Заголовок кнопки «назад» (в сплэше может быть «Назад», в настройках — «Закрыть» или оставить «Назад») */
  backLabel?: string
}

export default function DocumentView({ document: doc, onClose, backLabel = 'Назад' }: Props) {
  return (
    <div
      style={{
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
      }}
    >
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
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
          }}
        >
          {backLabel}
        </button>
        <span style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: 700, color: C.text, maxWidth: '60%', textAlign: 'center' }}>
          {doc.title}
        </span>
        <span style={{ width: 60, display: 'inline-block' }} />
      </header>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px',
        }}
      >
        <pre
          style={{
            fontFamily: 'inherit',
            fontSize: 'clamp(13px, 3vw, 15px)',
            color: C.text,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}
        >
          {doc.content}
        </pre>
      </div>
    </div>
  )
}
