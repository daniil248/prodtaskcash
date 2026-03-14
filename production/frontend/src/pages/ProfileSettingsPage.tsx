import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { profileApi } from '../api/client'
import { showToast } from '../components/Toast'
import AppHeader from '../components/AppHeader'
import { DOCUMENTS, getDocumentById } from '../documents'
import type { LegalDocument } from '../documents'
import DocumentView from '../components/DocumentView'

const C = {
  bg: '#F5F5F5',
  name: '#2B2A2E',
  border: '#EEECF9',
  label: '#4D536D',
  accent: '#23C366',
  white: '#FFFFFF',
}

const GRAD = 'linear-gradient(90deg, #23C366 0%, #1AAB57 100%)'

// Icons exactly from profile.svg (path data, viewBox = absolute SVG coords)
function SupportIcon() {
  return (
    <svg width="22" height="22" viewBox="1099 418 22 22" fill="none">
      <path d="M1120.35 422.5L1116 426.8C1116 426.8 1114.7 426.8 1113.4 425.5C1112.1 424.2 1112.1 422.9 1112.1 422.9L1116.45 418.55C1114 417.95 1111.05 418.75 1109.25 420.55C1106.55 423.25 1108.95 426.7 1108.25 427.4C1104.45 431.35 1100.55 434.35 1100.45 434.5C1099.3 435.65 1099.25 437.5 1100.35 438.6C1101.45 439.7 1103.3 439.65 1104.45 438.5C1104.6 438.35 1107.8 434.3 1111.55 430.55C1112.25 429.85 1115.55 432.4 1118.35 429.65C1120.1 427.85 1120.95 424.95 1120.35 422.5ZM1102.7 437.55C1102 437.55 1101.45 437 1101.45 436.3C1101.45 435.55 1102 435 1102.7 435C1103.4 435 1103.95 435.55 1103.95 436.25C1103.95 436.95 1103.4 437.55 1102.7 437.55Z" fill="#23C366" />
    </svg>
  )
}

function PrivacyIcon() {
  return (
    <svg width="20" height="22" viewBox="1101 478 18 22" fill="none">
      <path d="M1102.19 481.47C1101.47 481.79 1101 482.51 1101 483.3V488C1101 493.55 1104.84 498.74 1110 500C1115.16 498.74 1119 493.55 1119 488V483.3C1119 482.51 1118.53 481.79 1117.81 481.47L1110.81 478.36C1110.29 478.13 1109.7 478.13 1109.19 478.36L1102.19 481.47ZM1110 484C1110.55 484 1111 484.45 1111 485C1111 485.55 1110.55 486 1110 486C1109.45 486 1109 485.55 1109 485C1109 484.45 1109.45 484 1110 484ZM1110 488C1110.55 488 1111 488.45 1111 489V493C1111 493.55 1110.55 494 1110 494C1109.45 494 1109 493.55 1109 493V489C1109 488.45 1109.45 488 1110 488Z" fill="#23C366" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="20" height="22" viewBox="1101 539 18 20" fill="none">
      <path d="M1118.68 544.014C1118.46 543.549 1118.15 543.135 1117.76 542.794L1114.76 540.074C1114.1 539.468 1113.26 539.093 1112.37 539.004H1106.21C1105.55 538.975 1104.89 539.079 1104.26 539.309C1103.64 539.539 1103.07 539.891 1102.59 540.343C1102.1 540.795 1101.71 541.339 1101.44 541.944C1101.17 542.548 1101.02 543.201 1101 543.864V554.164C1101.04 555.163 1101.37 556.129 1101.96 556.937C1102.55 557.744 1103.37 558.356 1104.31 558.694C1104.92 558.926 1105.58 559.028 1106.23 558.994H1113.79C1114.45 559.022 1115.11 558.918 1115.74 558.688C1116.36 558.458 1116.93 558.106 1117.41 557.654C1117.9 557.202 1118.29 556.658 1118.56 556.053C1118.83 555.449 1118.98 554.796 1119 554.134V545.564C1119 545.03 1118.9 544.502 1118.68 544.014ZM1105.68 543.614H1108.94C1109.21 543.614 1109.46 543.719 1109.65 543.906C1109.83 544.094 1109.94 544.348 1109.94 544.614C1109.94 544.879 1109.83 545.133 1109.65 545.321C1109.46 545.508 1109.21 545.614 1108.94 545.614H1105.68C1105.41 545.614 1105.16 545.508 1104.97 545.321C1104.79 545.133 1104.68 544.879 1104.68 544.614C1104.68 544.348 1104.79 544.094 1104.97 543.906C1105.16 543.719 1105.41 543.614 1105.68 543.614ZM1113.79 555.994H1106.21C1105.69 555.994 1105.18 555.786 1104.8 555.414C1104.43 555.043 1104.22 554.535 1104.22 554.004C1104.22 553.474 1104.43 552.966 1104.8 552.594C1105.18 552.223 1105.69 552.014 1106.21 552.014H1113.79C1114.31 552.014 1114.82 552.223 1115.2 552.594C1115.57 552.966 1115.78 553.474 1115.78 554.004C1115.78 554.535 1115.57 555.043 1115.2 555.414C1114.82 555.786 1114.31 555.994 1113.79 555.994ZM1113.79 549.994H1106.21C1105.69 549.994 1105.18 549.786 1104.8 549.414C1104.43 549.043 1104.22 548.535 1104.22 548.004C1104.22 547.474 1104.43 546.966 1104.8 546.594C1105.18 546.223 1105.69 546.014 1106.21 546.014H1113.79C1114.31 546.014 1114.82 546.223 1115.2 546.594C1115.57 546.966 1115.78 547.474 1115.78 548.004C1115.78 548.535 1115.57 549.043 1115.2 549.414C1114.82 549.786 1114.31 549.994 1113.79 549.994Z" fill="#23C366" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="1101 600 19 18" fill="none">
      <path d="M1118 609H1108.5M1116 612L1119 609L1116 606M1111 604V603C1111 602.47 1110.79 601.961 1110.41 601.586C1110.04 601.211 1109.53 601 1109 601H1104C1103.47 601 1102.96 601.211 1102.59 601.586C1102.21 601.961 1102 602.47 1102 603V615C1102 615.53 1102.21 616.039 1102.59 616.414C1102.96 616.789 1103.47 617 1104 617H1109C1109.53 617 1110.04 616.789 1110.41 616.414C1110.79 616.039 1111 615.53 1111 615V614" stroke="#DD0097" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="8" height="14" viewBox="1403 422 8 14" fill="none">
      <path d="M1404.5 424L1409.5 429L1404.5 434" stroke={C.label} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ProfileSettingsPage() {
  const navigate = useNavigate()
  const { logout } = useStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [notify, setNotify] = useState({ notify_tasks: true, notify_withdrawals: true, notify_referrals: true })
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [openDocId, setOpenDocId] = useState<LegalDocument['id'] | null>(null)

  useEffect(() => {
    profileApi.getNotifications().then(({ data }) => setNotify(data)).catch(() => {})
  }, [])

  const toggleNotify = (key: 'notify_tasks' | 'notify_withdrawals' | 'notify_referrals') => {
    const next = { ...notify, [key]: !notify[key] }
    setNotifyLoading(true)
    profileApi.updateNotifications({ [key]: next[key] }).then(({ data }) => {
      setNotify(data)
      showToast('Сохранено', 'success')
    }).catch(() => showToast('Ошибка', 'error')).finally(() => setNotifyLoading(false))
  }

  const openLink = (url: string) => {
    const tg = window.Telegram?.WebApp as { openTelegramLink?: (url: string) => void; openLink?: (url: string) => void } | undefined
    if (tg?.openTelegramLink) tg.openTelegramLink(url)
    else if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  }

  const SUPPORT_TG = 'https://t.me/taskcash_support'
  const items = [
    {
      icon: <SupportIcon />,
      label: 'Техническая поддержка',
      subtitle: '@taskcash_support',
      onClick: () => openLink(SUPPORT_TG),
    },
    {
      icon: <PrivacyIcon />,
      label: DOCUMENTS[0].title,
      onClick: () => setOpenDocId('privacy'),
    },
    {
      icon: <FileIcon />,
      label: DOCUMENTS[1].title,
      onClick: () => setOpenDocId('agreement'),
    },
    {
      icon: <FileIcon />,
      label: DOCUMENTS[2].title,
      onClick: () => setOpenDocId('payout'),
    },
    {
      icon: <LogoutIcon />,
      label: 'Выйти',
      onClick: () => setShowLogoutModal(true),
      textColor: '#DD0097' as const,
    },
  ]

  return (
    <div className="page" style={{ background: C.bg }}>
      <AppHeader title="TASKCASH" showBack onBack={() => navigate('/profile')} />

      <div className="scroll-area" style={{ padding: '24px 16px' }}>
        <h2 style={{
          fontSize: 12, fontWeight: 700, color: C.label,
          letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16,
        }}>
          Настройки профиля
        </h2>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: C.label, marginBottom: 10 }}>Уведомления</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {[
            { key: 'notify_tasks' as const, label: 'Награды за задания' },
            { key: 'notify_withdrawals' as const, label: 'Вывод средств' },
            { key: 'notify_referrals' as const, label: 'Реферальные бонусы' },
          ].map(({ key, label }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: '#E2F3EE', borderRadius: 12,
            }}>
              <span style={{ fontSize: 14, color: C.name }}>{label}</span>
              <button
                type="button"
                disabled={notifyLoading}
                onClick={() => toggleNotify(key)}
                style={{
                  width: 48, height: 28, borderRadius: 14,
                  background: notify[key] ? C.accent : C.border,
                  border: 'none', cursor: notifyLoading ? 'default' : 'pointer',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute',
                  left: notify[key] ? 24 : 4,
                  top: 4,
                  width: 20, height: 20, borderRadius: 10,
                  background: C.white, transition: 'left 0.2s',
                }} />
              </button>
            </div>
          ))}
        </div>

        {/* Settings items — each with #E2F3EE background from SVG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={item.onClick}
              style={{
                width: '100%', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#E2F3EE',
                border: 'none', borderRadius: 12,
                cursor: 'pointer', textAlign: 'left', minHeight: 48,
              }}
            >
              {item.icon}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  color: item.textColor || C.name,
                }}>
                  {item.label}
                </div>
                {'subtitle' in item && item.subtitle && (
                  <div style={{ fontSize: 12, color: C.label, marginTop: 2 }}>
                    {item.subtitle}
                  </div>
                )}
              </div>
              <ChevronRight />
            </button>
          ))}
        </div>

        {/* Delete account link */}
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{
            background: 'none', border: 'none', color: '#EF4444',
            fontSize: 13, cursor: 'pointer', width: '100%',
            padding: '14px 0', textAlign: 'center', marginTop: 24,
          }}
        >
          Удалить аккаунт
        </button>
      </div>

      {/* ── DELETE ACCOUNT MODAL — from SVG "delete account" screen ──────── */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            width: '100%', maxWidth: 340,
            background: C.white, borderRadius: 20,
            padding: '28px 24px 24px', position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowDeleteModal(false)} style={{
              position: 'absolute', top: 16, right: 16,
              width: 28, height: 28, borderRadius: '50%',
              border: 'none', background: C.bg,
              fontSize: 16, cursor: 'pointer', color: C.label,
            }}>×</button>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.name, marginBottom: 12 }}>Удалить аккаунт</p>
            <p style={{ fontSize: 13, color: C.label, lineHeight: 1.5, marginBottom: 24 }}>
              Вы уверены, что хотите удалить ваш аккаунт? Все данные на вашем аккаунте будут удалены без возврата.
            </p>
            <button onClick={() => setShowDeleteModal(false)} style={{
              width: '100%', height: 48, borderRadius: 24, border: 'none',
              background: GRAD, color: C.white, fontWeight: 700, fontSize: 15,
              cursor: 'pointer', marginBottom: 14,
            }}>
              Отменить
            </button>
            <div style={{ textAlign: 'center' }}>
              <button onClick={async () => {
                try {
                  await profileApi.delete()
                  logout()
                  navigate('/login')
                } catch {
                  showToast('Ошибка удаления аккаунта', 'error')
                }
                setShowDeleteModal(false)
              }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: '#EF4444',
              }}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGOUT MODAL — from SVG "logout" screen ──────────────────────── */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }} onClick={() => setShowLogoutModal(false)}>
          <div style={{
            width: '100%', maxWidth: 340,
            background: C.white, borderRadius: 20,
            padding: '28px 24px 24px', position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowLogoutModal(false)} style={{
              position: 'absolute', top: 16, right: 16,
              width: 28, height: 28, borderRadius: '50%',
              border: 'none', background: C.bg,
              fontSize: 16, cursor: 'pointer', color: C.label,
            }}>×</button>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.name, marginBottom: 12 }}>Выйти</p>
            <p style={{ fontSize: 13, color: C.label, lineHeight: 1.5, marginBottom: 24 }}>
              Вы уверены, что хотите покинуть сервис?
            </p>
            <button onClick={() => { logout(); navigate('/login'); setShowLogoutModal(false) }} style={{
              width: '100%', height: 48, borderRadius: 24, border: 'none',
              background: '#EF4444', color: C.white, fontWeight: 700, fontSize: 15,
              cursor: 'pointer', marginBottom: 14,
            }}>
              Выйти
            </button>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: C.accent,
              }}>
                Отменить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Документы открываются в мини-апп: скролл, закрыть по кнопке «Назад» */}
      {openDocId && getDocumentById(openDocId) && (
        <DocumentView
          document={getDocumentById(openDocId)!}
          onClose={() => setOpenDocId(null)}
          backLabel="Закрыть"
        />
      )}
    </div>
  )
}
