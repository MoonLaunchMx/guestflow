'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Event = {
  id: string
  name: string
  event_date: string | null
  venue: string | null
  event_type: string | null
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  boda:        '💍 Boda',
  cumpleanos:  '🎂 Cumpleaños',
  fiesta:      '🎉 Fiesta',
  corporativo: '💼 Corporativo',
  bautizo:     '🕊️ Bautizo',
  otro:        '📅 Otro',
}

const NAV_ITEMS = [
  {
    label: 'Invitados', path: '',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    label: 'Álbum', path: '/album',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  },
  {
    label: 'Playlist', path: '/playlist',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  },
  {
    label: 'Configuración', path: '/configuracion',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  },
]

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const loadEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, event_date, venue, event_type')
        .eq('id', id)
        .single()
      if (data) setEvent(data)
    }
    loadEvent()
  }, [id])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  const isActive = (path: string) => {
    const full = `/events/${id}${path}`
    if (path === '') return pathname === `/events/${id}`
    return pathname.startsWith(full)
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      color: '#1D1E20',
      overflow: 'hidden',
    }}>

      {/* ── TOP NAV ── */}
      <div style={{
        borderBottom: '1px solid #e8e8e8',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        flexShrink: 0,
        background: '#ffffff',
      }}>
        <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Georgia, serif' }}>
          Guest<span style={{ color: '#48C9B0' }}>Flow</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-menu-btn"
          style={{ display: 'none', background: 'transparent', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer' }}
        >
          ☰
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <div
          className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
          style={{
            width: '220px',
            flexShrink: 0,
            borderRight: '1px solid #e8e8e8',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8f5f0',
            overflowY: 'auto',
          }}
        >
          {/* Evento info */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #e8e8e8' }}>
            {event?.event_type && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
              </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1D1E20', lineHeight: '1.3', marginBottom: '4px' }}>
              {event?.name || '...'}
            </div>
            {event?.event_date && (
              <div style={{ fontSize: '11px', color: '#999' }}>
                {formatDate(event.event_date)}
              </div>
            )}
            {event?.venue && (
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                📍 {event.venue}
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ padding: '8px 0', flex: 1 }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.path}
                onClick={() => { router.push(`/events/${id}${item.path}`); setSidebarOpen(false) }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isActive(item.path) ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderLeft: isActive(item.path) ? '3px solid #48C9B0' : '3px solid transparent',
                  color: isActive(item.path) ? '#1D1E20' : '#888',
                  fontSize: '14px',
                  fontWeight: isActive(item.path) ? '600' : '400',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.icon}</span>
              </button>
            ))}
          </nav>

          {/* Back button */}
          <div style={{ padding: '16px' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '6px',
                color: '#999',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ← Mis eventos
            </button>
          </div>
        </div>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="sidebar-overlay"
            style={{
              position: 'fixed',
              top: '60px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 40,
              display: 'none',
            }}
          />
        )}

        {/* ── MAIN CONTENT ── */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
        }}>
          {children}
        </div>
      </div>

      <style>{`
        body { background: #ffffff !important; margin: 0; }
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            top: 60px !important;
            left: -220px !important;
            height: calc(100vh - 60px) !important;
            z-index: 45 !important;
            transition: left 0.25s ease !important;
          }
          .sidebar.sidebar-open { left: 0 !important; }
          .sidebar-overlay { display: block !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  )
}