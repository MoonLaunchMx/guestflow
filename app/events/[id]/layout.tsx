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
    label: 'Invitados',
    path: '',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Álbum',
    path: '/album',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    label: 'Playlist',
    path: '/playlist',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    label: 'Config',
    path: '/configuracion',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const navigate = (path: string) => {
    router.push(`/events/${id}${path}`)
    setDrawerOpen(false)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white font-sans text-[#1D1E20]">

      {/* ══ TOP NAV ══ */}
      <header className="hidden h-14 shrink-0 items-center justify-between border-b border-[#e8e8e8] bg-white px-4 sm:h-16 sm:px-6">
        <span className="text-lg font-bold sm:text-xl" style={{ fontFamily: 'Georgia, serif' }}>
          Guest<span className="text-[#48C9B0]">Flow</span>
        </span>

        {event && (
          <span className="hidden max-w-[240px] truncate text-sm font-semibold text-[#1D1E20] sm:block lg:max-w-sm">
            {event.name}
          </span>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-[#999] transition hover:text-[#48C9B0]"
          >
            ← Mis eventos
          </button>
          {/* Hamburger — solo tablet */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-[#e0e0e0] text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0] sm:flex lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ══ SIDEBAR — solo desktop ══ */}
        <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-[#e8e8e8] bg-[#f8f5f0] lg:flex">
          <div className="border-b border-[#e8e8e8] px-4 py-5">
            {event?.event_type && (
              <p className="mb-1 text-[11px] text-[#999]">
                {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
              </p>
            )}
            <p className="text-sm font-bold leading-snug text-[#1D1E20]">
              {event?.name || '...'}
            </p>
            {event?.event_date && (
              <p className="mt-1 text-[11px] text-[#999]">{formatDate(event.event_date)}</p>
            )}
            {event?.venue && (
              <p className="mt-0.5 text-[11px] text-[#aaa]">📍 {event.venue}</p>
            )}
          </div>
          <nav className="flex-1 py-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-left text-sm transition
                  ${isActive(item.path)
                    ? 'border-[#48C9B0] bg-white font-semibold text-[#1D1E20]'
                    : 'border-transparent font-normal text-[#888] hover:bg-white/60 hover:text-[#1D1E20]'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ══ DRAWER — tablet ══ */}
        {drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 top-14 z-40 bg-black/30 lg:hidden"
            />
            <div className="fixed left-0 top-14 z-50 flex h-[calc(100vh-56px)] w-56 flex-col overflow-y-auto border-r border-[#e8e8e8] bg-[#f8f5f0] shadow-lg lg:hidden">
              <div className="border-b border-[#e8e8e8] px-4 py-5">
                {event?.event_type && (
                  <p className="mb-1 text-[11px] text-[#999]">
                    {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                  </p>
                )}
                <p className="text-sm font-bold leading-snug text-[#1D1E20]">
                  {event?.name || '...'}
                </p>
                {event?.event_date && (
                  <p className="mt-1 text-[11px] text-[#999]">{formatDate(event.event_date)}</p>
                )}
                {event?.venue && (
                  <p className="mt-0.5 text-[11px] text-[#aaa]">📍 {event.venue}</p>
                )}
              </div>
              <nav className="flex-1 py-2">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex w-full items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-left text-sm transition
                      ${isActive(item.path)
                        ? 'border-[#48C9B0] bg-white font-semibold text-[#1D1E20]'
                        : 'border-transparent font-normal text-[#888] hover:bg-white/60 hover:text-[#1D1E20]'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </>
        )}

        {/* ══ MAIN CONTENT ══ */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {children}
        </main>
      </div>

      {/* ══ BOTTOM NAV — solo mobile ══ */}
      <nav className="flex shrink-0 border-t border-[#e8e8e8] bg-white sm:hidden">
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition
              ${isActive(item.path)
                ? 'text-[#48C9B0]'
                : 'text-[#bbb] hover:text-[#888]'
              }`}
          >
            <span className={isActive(item.path) ? 'text-[#48C9B0]' : 'text-[#bbb]'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  )
}