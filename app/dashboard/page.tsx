'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Event, EventStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type EventWithStats = Event & {
  confirmed: number
  pending: number
  declined: number
  total: number
}

type Tab = 'activos' | 'pasados' | 'pausados' | 'cancelados'

const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfESosGtmv8JPds_zhTw280121oV1h09WNIbAhW-IyCAFq8cw/viewform?usp=publish-editor'

export default function Dashboard() {
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [now, setNow] = useState(new Date())
  const [activeTab, setActiveTab] = useState<Tab>('activos')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { checkAuth(); loadData() }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-menu]')) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    setUserEmail(user.email || '')
    const welcomed = localStorage.getItem('gf_welcomed')
    if (!welcomed) { setShowWelcome(true); localStorage.setItem('gf_welcomed', '1') }
  }

  const loadData = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, event_date, event_end_date, event_time, venue, total_guests, event_status')
      .order('event_date', { ascending: true })

    if (!eventsData) { setLoading(false); return }

    const eventsWithStats: EventWithStats[] = await Promise.all(
      eventsData.map(async (event) => {
        const [{ data: guests }, { data: members }] = await Promise.all([
          supabase.from('guests').select('rsvp_status').eq('event_id', event.id),
          supabase.from('party_members').select('rsvp_status').eq('event_id', event.id),
        ])
        const all = [...(guests || []), ...(members || [])]
        return {
          ...event,
          event_status: event.event_status || 'active',
          total:     all.length,
          confirmed: all.filter(g => g.rsvp_status === 'confirmed').length,
          pending:   all.filter(g => g.rsvp_status === 'pending').length,
          declined:  all.filter(g => g.rsvp_status === 'declined').length,
        }
      })
    )

    setEvents(eventsWithStats)
    setLoading(false)
  }

  const handleStatusChange = async (event: EventWithStats, newStatus: EventStatus, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenuId(null)
    setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, event_status: newStatus } : ev))
    await supabase.from('events').update({ event_status: newStatus }).eq('id', event.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const getEventDateTime = (event: Event): Date => {
    const [year, month, day] = event.event_date.split('T')[0].split('-').map(Number)
    const base = new Date(year, month - 1, day)
    if (event.event_time) {
      const [h, m] = event.event_time.split(':').map(Number)
      base.setHours(h, m, 0, 0)
    } else {
      base.setHours(0, 0, 0, 0)
    }
    return base
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 || 12
    return h12 + ':' + m.toString().padStart(2, '0') + ' ' + ampm
  }

  const getCountdown = (event: Event): string => {
    const target = getEventDateTime(event)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return '¡Es hoy!'
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24))
    const months    = Math.floor(totalDays / 30)
    const days      = totalDays % 30
    const hours     = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes   = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds   = Math.floor((diff % (1000 * 60)) / 1000)
    if (totalDays >= 1) {
      if (months > 0) return `${months}m ${days}d ${hours}h`
      return `${days}d ${hours}h`
    }
    return `${hours}h ${minutes}m ${seconds}s`
  }

  const confirmPct = (e: EventWithStats) =>
    e.total > 0 ? Math.round((e.confirmed / e.total) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isUpcoming = (e: Event) => {
    const d = getEventDateTime(e)
    d.setHours(0, 0, 0, 0)
    return d >= today
  }

  const activeEvents = [...events]
    .filter(e => e.event_status === 'active' && isUpcoming(e))
    .sort((a, b) => {
      const diff = getEventDateTime(a).getTime() - getEventDateTime(b).getTime()
      return sortAsc ? diff : -diff
    })

  const pastEvents = [...events]
    .filter(e => e.event_status === 'active' && !isUpcoming(e))
    .sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime())

  const pausedEvents = [...events]
    .filter(e => e.event_status === 'paused')
    .sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime())

  const cancelledEvents = [...events]
    .filter(e => e.event_status === 'cancelled')
    .sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime())

  const nextEvent = activeEvents.length > 0 ? activeEvents[0] : null

  const sameDay = nextEvent
    ? activeEvents.filter(e =>
        e.id !== nextEvent.id &&
        e.event_date.split('T')[0] === nextEvent.event_date.split('T')[0]
      )
    : []

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'activos',    label: 'Activos',    count: activeEvents.length },
    { key: 'pasados',    label: 'Pasados',    count: pastEvents.length },
    { key: 'pausados',   label: 'Pausados',   count: pausedEvents.length },
    { key: 'cancelados', label: 'Cancelados', count: cancelledEvents.length },
  ]

  const currentEvents =
    activeTab === 'activos'    ? activeEvents :
    activeTab === 'pasados'    ? pastEvents :
    activeTab === 'pausados'   ? pausedEvents :
    cancelledEvents

  const getMenuOptions = (event: EventWithStats) => {
    const all: { label: string; status: EventStatus; color?: string }[] = [
      { label: '● Activo',    status: 'active' },
      { label: '⏸ Pausado',   status: 'paused' },
      { label: '✕ Cancelado', status: 'cancelled', color: '#cc3333' },
    ]
    return all.filter(o => o.status !== event.event_status)
  }

  const EventCard = ({ event }: { event: EventWithStats }) => {
    const pct = confirmPct(event)
    const isNext = event.id === nextEvent?.id
    const isDimmed = activeTab !== 'activos'
    const menuOpen = openMenuId === event.id

    return (
      <div
        onClick={() => window.location.href = '/events/' + event.id}
        className={'group relative cursor-pointer rounded-xl border bg-white px-4 py-4 transition hover:border-[#48C9B0] hover:shadow-[0_2px_12px_rgba(72,201,176,0.12)] active:scale-[0.99] sm:px-5 sm:py-4 ' + (isNext ? 'border-[#48C9B0]/40' : 'border-[#e8e8e8]') + (isDimmed ? ' opacity-70' : '')}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#1D1E20]">{event.name}</p>
            <p className="mt-0.5 text-xs text-[#888]">
              {formatDate(event.event_date)}
              {event.event_time && ' · ' + formatTime(event.event_time)}
              {event.venue && ' · ' + event.venue}
            </p>
          </div>
          <div data-menu className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : event.id) }}
              className={'flex h-7 w-7 items-center justify-center rounded-lg text-[#bbb] transition hover:bg-[#f0f0f0] hover:text-[#555] ' + (menuOpen ? 'bg-[#f0f0f0] text-[#555]' : '')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="7" cy="2.5" r="1.2"/>
                <circle cx="7" cy="7" r="1.2"/>
                <circle cx="7" cy="11.5" r="1.2"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-lg">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#bbb]">Cambiar estado</div>
                {getMenuOptions(event).map(opt => (
                  <button key={opt.status} onClick={e => handleStatusChange(event, opt.status, e)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-[#f8f8f8]"
                    style={{ color: opt.color || '#555' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2">
          {[
            { label: 'Total',  value: event.total,     color: '#1D1E20' },
            { label: 'Conf.',  value: event.confirmed, color: '#2a7a50' },
            { label: 'Pend.',  value: event.pending,   color: '#b8860b' },
            { label: 'Decl.',  value: event.declined,  color: '#cc3333' },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-[#f8f8f8] p-2 text-center">
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#999]">{s.label}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-[#aaa]">Confirmados</span>
            <span className="text-[10px] font-semibold text-[#48C9B0]">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
            <div className="h-full rounded-full bg-[#48C9B0] transition-all duration-500" style={{ width: pct + '%' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] font-sans text-[#1D1E20]">

      {/* MODAL BIENVENIDA */}
      {showWelcome && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span style={{ fontFamily: 'Georgia, serif' }} className="text-xl font-bold text-[#1D1E20]">
                Guest<span className="text-[#48C9B0]">Flow</span>
              </span>
              <span className="rounded-full border border-[#48C9B0]/40 bg-[#f0fdfb] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#48C9B0]">Beta</span>
            </div>
            <h2 className="mb-2 text-lg font-bold text-[#1D1E20]">¡Bienvenido a GuestFlow!</h2>
            <p className="mb-4 text-sm leading-relaxed text-[#666]">
              Gracias por ser parte de esta versión beta. GuestFlow te ayuda a gestionar listas de invitados y automatizar comunicación por WhatsApp para tus eventos.
            </p>
            <div className="mb-5 flex flex-col gap-2 rounded-xl bg-[#f8f8f8] p-4">
              {[
                { icon: '📋', text: 'Crea eventos y agrega invitados fácilmente' },
                { icon: '💬', text: 'Envía mensajes de WhatsApp con plantillas personalizadas' },
                { icon: '📊', text: 'Rastrea confirmaciones, pendientes y declinados en tiempo real' },
                { icon: '📁', text: 'Importa listas desde CSV con un clic' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <p className="text-xs leading-relaxed text-[#555]">{item.text}</p>
                </div>
              ))}
            </div>
            <p className="mb-5 text-xs leading-relaxed text-[#888]">Estás usando una versión beta. Tu feedback es muy valioso para mejorar la app.</p>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => window.open(FEEDBACK_URL, '_blank')}
                className="w-full rounded-lg border border-[#48C9B0] bg-[#f0fdfb] py-2.5 text-sm font-semibold text-[#1a9e88] transition hover:bg-[#e0faf5]">
                Dar feedback →
              </button>
              <button onClick={() => setShowWelcome(false)}
                className="w-full rounded-lg bg-[#1D1E20] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d2e30]">
                Empezar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-[#e8e8e8] bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <span className="text-lg font-bold sm:text-xl" style={{ fontFamily: 'Georgia, serif' }}>
            Guest<span className="text-[#48C9B0]">Flow</span>
          </span>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden truncate text-xs text-[#888] sm:block sm:max-w-[200px] sm:text-sm">{userEmail}</span>
            <button onClick={handleLogout} className="rounded-md border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#888] transition hover:bg-[#f5f5f5] sm:px-4 sm:text-sm">Salir</button>
          </div>
        </div>
      </header>

      {/* Zona fija */}
      <div className="shrink-0 bg-[#f8f8f8]">
        <div className="mx-auto max-w-4xl px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">

          <div className="mb-5 flex items-center justify-between sm:mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1D1E20] sm:text-2xl">Dashboard</h1>
              <p className="mt-0.5 text-xs text-[#888] sm:text-sm">Resumen de tus eventos</p>
            </div>
            <button onClick={() => window.location.href = '/events/new'}
              className="rounded-lg bg-[#48C9B0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3ab89f] active:scale-95 sm:px-5 sm:py-2.5">
              <span className="sm:hidden">+ Nuevo</span>
              <span className="hidden sm:inline">+ Nuevo evento</span>
            </button>
          </div>

          {!loading && nextEvent && (
            <div onClick={() => window.location.href = '/events/' + nextEvent.id}
              className="mb-5 cursor-pointer rounded-2xl border border-[#48C9B0]/30 bg-white p-4 shadow-[0_2px_16px_rgba(72,201,176,0.1)] transition hover:shadow-[0_4px_24px_rgba(72,201,176,0.18)] sm:mb-6">
              <div className="flex items-stretch gap-4">
                <div className="min-w-0 flex-1">
                  <span className="mb-1.5 inline-block rounded-full bg-[#e8f7f3] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#48C9B0]">
                    Próximo evento
                  </span>
                  <h2 className="truncate text-sm font-bold text-[#1D1E20] sm:text-base">{nextEvent.name}</h2>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {formatDate(nextEvent.event_date)}
                    {nextEvent.event_time && ' · ' + formatTime(nextEvent.event_time)}
                    {nextEvent.venue && ' · ' + nextEvent.venue}
                  </p>
                  <div className="mt-3 rounded-xl bg-[#f8f5f0] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#aaa]">Faltan</p>
                    <p className="font-mono text-xl font-bold text-[#48C9B0] sm:text-2xl">{getCountdown(nextEvent)}</p>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  {[
                    { label: 'Total',  value: nextEvent.total,     color: '#1D1E20' },
                    { label: 'Conf.',  value: nextEvent.confirmed, color: '#2a7a50' },
                    { label: 'Pend.',  value: nextEvent.pending,   color: '#b8860b' },
                    { label: 'Decl.',  value: nextEvent.declined,  color: '#cc3333' },
                  ].map(s => (
                    <div key={s.label} className="flex flex-1 flex-col items-center justify-center rounded-lg border border-[#e8e8e8] bg-[#f8f8f8]">
                      <p className="text-sm font-bold sm:text-base" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] text-[#999]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {sameDay.length > 0 && (
                <div className="mt-3 border-t border-[#f0f0f0] pt-2">
                  {sameDay.map(e => (
                    <p key={e.id} className="text-xs text-[#aaa]">
                      También tienes: <span className="font-semibold text-[#888]">{e.name}</span>
                      {e.event_time && ' a las ' + formatTime(e.event_time)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pb-3">
            <div className="grid flex-1 grid-cols-4 gap-1">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ' + (activeTab === tab.key ? 'bg-[#1D1E20] text-white' : 'text-[#888] hover:bg-[#efefef]')}>
                  {tab.label}
                  <span className={'rounded-full px-1.5 py-0.5 text-[10px] font-bold ' + (activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-[#e8e8e8] text-[#666]')}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            {activeTab === 'activos' && (
              <button onClick={() => setSortAsc(!sortAsc)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4-3 4 3M2 8l4 3 4-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {sortAsc ? 'Fecha ↑' : 'Fecha ↓'}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Lista scrolleable */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-sm text-[#888]">Cargando...</div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e0e0] px-6 py-16 text-center sm:py-20">
              <div className="mb-4 text-4xl">💍</div>
              <p className="text-sm text-[#888] sm:text-base">Aún no tienes eventos</p>
              <p className="mt-1 text-xs text-[#bbb] sm:text-sm">Crea tu primer evento para empezar</p>
            </div>
          ) : currentEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e0e0] px-6 py-16 text-center sm:py-20">
              <p className="text-sm text-[#888]">
                {activeTab === 'activos'    && 'No tienes eventos activos'}
                {activeTab === 'pasados'    && 'No tienes eventos pasados'}
                {activeTab === 'pausados'   && 'No tienes eventos pausados'}
                {activeTab === 'cancelados' && 'No tienes eventos cancelados'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {currentEvents.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}