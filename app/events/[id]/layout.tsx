'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Images, Music2, Settings, UtensilsCrossed, LayoutGrid, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Event } from '@/lib/types'

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
    labelMobile: 'Invitados',
    path: '',
    iconOutline: <Users width={18} height={18} strokeWidth={1.5} />,
    iconFilled:  <Users width={18} height={18} strokeWidth={2.5} />,
  },
  {
    label: 'Mesas',
    labelMobile: 'Mesas',
    path: '/mesas',
    iconOutline: <LayoutGrid width={18} height={18} strokeWidth={1.5} />,
    iconFilled:  <LayoutGrid width={18} height={18} strokeWidth={2.5} />,
  },
  {
    label: 'Álbum',
    labelMobile: 'Álbum',
    path: '/album',
    iconOutline: <Images width={18} height={18} strokeWidth={1.5} />,
    iconFilled:  <Images width={18} height={18} strokeWidth={2.5} />,
  },
  {
    label: 'Playlist',
    labelMobile: 'Playlist',
    path: '/playlist',
    iconOutline: <Music2 width={18} height={18} strokeWidth={1.5} />,
    iconFilled:  <Music2 width={18} height={18} strokeWidth={2.5} />,
  },
  {
    label: 'Comida',
    labelMobile: 'Comida',
    path: '/comida',
    iconOutline: <UtensilsCrossed width={18} height={18} strokeWidth={1.5} />,
    iconFilled:  <UtensilsCrossed width={18} height={18} strokeWidth={2.5} />,
  },
  {
    label: 'Configuración',
    labelMobile: 'Config',
    path: '/configuracion',
    iconOutline: <Settings width={18} height={18} strokeWidth={1.5} />,
    iconFilled:  <Settings width={18} height={18} strokeWidth={2.5} />,
  },
]

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

// Bottom nav: 2 izquierda + WA FAB + 2 derecha
const LEFT_ITEMS  = NAV_ITEMS.slice(0, 2)
const RIGHT_ITEMS = NAV_ITEMS.slice(2, 4)

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('gf_sidebar_collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleSidebar = () => {
    setCollapsed(prev => {
      localStorage.setItem('gf_sidebar_collapsed', String(!prev))
      return !prev
    })
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) {
        router.replace('/')
      } else if (session) {
        setAuthChecked(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    const loadEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, event_date, event_end_date, venue, event_type')
        .eq('id', id)
        .single()
      if (data) setEvent(data as any)
    }
    loadEvent()
  }, [id, authChecked])

  const formatDate = (d: string) => {
    const [year, month, day] = d.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const isActive = (path: string) => {
    const full = `/events/${id}${path}`
    if (path === '') return pathname === `/events/${id}`
    return pathname.startsWith(full)
  }

  const navigate = (path: string) => {
    router.push(`/events/${id}${path}`)
    setDrawerOpen(false)
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#48C9B0]" />
          <p className="text-sm text-[#999]">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white font-sans text-[#1D1E20]">

      {/* ══ TABLET/DESKTOP HEADER ══ */}
      <header className="hidden h-14 shrink-0 items-center justify-between border-b border-[#e8e8e8] bg-white px-4 sm:flex sm:h-16 sm:px-6">
        <span className="text-lg font-bold sm:text-xl" style={{ fontFamily: 'Georgia, serif' }}>
          Guest<span className="text-[#48C9B0]">Flow</span>
        </span>
        {event && (
          <span className="hidden max-w-[240px] truncate text-sm font-semibold text-[#1D1E20] sm:block lg:max-w-sm">
            {event.name}
          </span>
        )}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-xs text-[#999] transition hover:text-[#48C9B0]">
            ← Mis eventos
          </button>
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
        <aside
          className="hidden shrink-0 flex-col overflow-hidden border-r border-[#e8e8e8] bg-[#f8f5f0] lg:flex"
          style={{ width: collapsed ? '56px' : '224px', transition: 'width 0.2s ease' }}
        >
          <nav className="py-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center border-l-[3px] py-2.5 text-left text-sm transition
                  ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}
                  ${isActive(item.path)
                    ? 'border-[#48C9B0] bg-white font-semibold text-[#1D1E20]'
                    : 'border-transparent font-normal text-[#888] hover:bg-white/60 hover:text-[#1D1E20]'
                  }`}
              >
                {isActive(item.path) ? item.iconFilled : item.iconOutline}
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="shrink-0 border-t border-[#e8e8e8] px-4 py-3">
            <button
              onClick={toggleSidebar}
              title={collapsed ? 'Expandir' : 'Colapsar'}
              className={`flex w-full items-center rounded-md border border-[#e0e0e0] text-[#aaa] transition hover:border-[#48C9B0] hover:text-[#48C9B0]
                ${collapsed ? 'h-7 justify-center' : 'gap-2 px-2.5 py-2'}`}
            >
              {collapsed
                ? <PanelLeftOpen width={14} height={14} />
                : <><PanelLeftClose width={14} height={14} /><span className="text-xs font-medium">Colapsar</span></>
              }
            </button>
          </div>
        </aside>

        {/* ══ DRAWER — tablet ══ */}
        {drawerOpen && (
          <>
            <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 top-16 z-40 bg-black/30 lg:hidden" />
            <div className="fixed left-0 top-16 z-50 flex h-[calc(100vh-64px)] w-56 flex-col overflow-y-auto border-r border-[#e8e8e8] bg-[#f8f5f0] shadow-lg lg:hidden">
              <div className="border-b border-[#e8e8e8] px-4 py-5">
                {event?.event_type && (
                  <p className="mb-1 text-[11px] text-[#999]">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</p>
                )}
                <p className="text-sm font-bold leading-snug text-[#1D1E20]">{event?.name || '...'}</p>
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
                    {isActive(item.path) ? item.iconFilled : item.iconOutline}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </>
        )}

        {/* ══ MAIN CONTENT ══ */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white pb-16 sm:pb-0">
          {children}
        </main>
      </div>

      {/* ══ BOTTOM NAV — solo mobile ══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-end border-t border-[#e8e8e8] bg-white sm:hidden">
        {LEFT_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition
              ${isActive(item.path) ? 'text-[#48C9B0]' : 'text-[#bbb]'}`}
          >
            {isActive(item.path) ? item.iconFilled : item.iconOutline}
            <span>{item.labelMobile ?? item.label}</span>
          </button>
        ))}
        <div className="flex flex-1 flex-col items-center justify-end pb-1">
          <button
            onClick={() => router.push('/mensajes')}
            className="relative -top-4 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-[#48C9B0] text-white shadow-[0_4px_16px_rgba(72,201,176,0.5)] transition active:scale-95"
          >
            <span className="flex h-6 w-6 items-center justify-center">{WA_ICON}</span>
            <span className="mt-0.5 text-[9px] font-semibold leading-none">Hub</span>
          </button>
        </div>
        {RIGHT_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition
              ${isActive(item.path) ? 'text-[#48C9B0]' : 'text-[#bbb]'}`}
          >
            {isActive(item.path) ? item.iconFilled : item.iconOutline}
            <span>{item.labelMobile ?? item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  )
}