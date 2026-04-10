'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

type Event = {
  id: string
  name: string
  event_date: string
  event_time: string | null
  venue: string | null
  total_guests: number
}

type EventWithStats = Event & {
  confirmed: number
  pending: number
  declined: number
  total: number
}

export default function Dashboard() {
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [now, setNow] = useState(new Date())

  // Tick cada segundo para el countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { checkAuth(); loadData() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    setUserEmail(user.email || '')
  }

  const loadData = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, event_date, event_time, venue, total_guests')
      .order('event_date', { ascending: true })

    if (!eventsData) { setLoading(false); return }

    // Para cada evento, cargar guests + party_members
    const eventsWithStats: EventWithStats[] = await Promise.all(
      eventsData.map(async (event) => {
        const [{ data: guests }, { data: members }] = await Promise.all([
          supabase.from('guests').select('rsvp_status').eq('event_id', event.id),
          supabase.from('party_members').select('rsvp_status').eq('event_id', event.id),
        ])

        const all = [...(guests || []), ...(members || [])]
        return {
          ...event,
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
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const getCountdown = (event: Event): string => {
    const target = getEventDateTime(event)
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return '¡Es hoy!'

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    return `${minutes}m ${seconds}s`
  }

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = getEventDateTime(a).getTime()
    const dateB = getEventDateTime(b).getTime()
    return sortAsc ? dateA - dateB : dateB - dateA
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureEvents = sortedEvents.filter(e => {
    const d = getEventDateTime(e)
    d.setHours(0, 0, 0, 0)
    return d >= today
  })

  const nextEvent = futureEvents.length > 0
    ? [...futureEvents].sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime())[0]
    : null

  // Eventos el mismo día que el nextEvent pero distintos
  const sameDay = nextEvent
    ? futureEvents.filter(e =>
        e.id !== nextEvent.id &&
        e.event_date.split('T')[0] === nextEvent.event_date.split('T')[0]
      )
    : []

  const confirmPct = (e: EventWithStats) =>
    e.total > 0 ? Math.round((e.confirmed / e.total) * 100) : 0

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] font-sans text-[#1D1E20]">

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-[#e8e8e8] bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <span className="text-lg font-bold sm:text-xl" style={{ fontFamily: 'Georgia, serif' }}>
            Guest<span className="text-[#48C9B0]">Flow</span>
          </span>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden truncate text-xs text-[#888] sm:block sm:max-w-[200px] sm:text-sm">
              {userEmail}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#888] transition hover:bg-[#f5f5f5] sm:px-4 sm:text-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── Zona fija: título + próximo evento ── */}
      <div className="shrink-0 bg-[#f8f8f8]">
        <div className="mx-auto max-w-4xl px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">

          {/* Título + botón */}
          <div className="mb-5 flex items-center justify-between sm:mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1D1E20] sm:text-2xl">Dashboard</h1>
              <p className="mt-0.5 text-xs text-[#888] sm:text-sm">Resumen de tus eventos</p>
            </div>
            <button
              onClick={() => window.location.href = '/events/new'}
              className="rounded-lg bg-[#48C9B0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3ab89f] active:scale-95 sm:px-5 sm:py-2.5"
            >
              <span className="sm:hidden">+ Nuevo</span>
              <span className="hidden sm:inline">+ Nuevo evento</span>
            </button>
          </div>

{/* Banner próximo evento */}
{!loading && nextEvent && (
  <div
    onClick={() => window.location.href = `/events/${nextEvent.id}`}
    className="mb-5 cursor-pointer rounded-2xl border border-[#48C9B0]/30 bg-white p-4 shadow-[0_2px_16px_rgba(72,201,176,0.1)] transition hover:shadow-[0_4px_24px_rgba(72,201,176,0.18)] sm:mb-6"
  >
    <div className="flex items-stretch gap-4">

      {/* Izquierda — nombre + countdown */}
      <div className="min-w-0 flex-1">
        <span className="mb-1.5 inline-block rounded-full bg-[#e8f7f3] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#48C9B0]">
          Próximo evento
        </span>
        <h2 className="truncate text-sm font-bold text-[#1D1E20] sm:text-base">{nextEvent.name}</h2>
        <p className="mt-0.5 text-xs text-[#888]">
          {formatDate(nextEvent.event_date)}
          {nextEvent.event_time && ` · ${formatTime(nextEvent.event_time)}`}
          {nextEvent.venue && ` · ${nextEvent.venue}`}
        </p>
        <div className="mt-3 rounded-xl bg-[#f8f5f0] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#aaa]">Faltan</p>
          <p className="font-mono text-xl font-bold text-[#48C9B0] sm:text-2xl">
            {getCountdown(nextEvent)}
          </p>
        </div>
      </div>

    {/* Derecha — 2x2 grid, mismo alto que izquierda */}
    <div className="flex-1 grid grid-cols-2 gap-2">
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

    {/* Mismo día */}
    {sameDay.length > 0 && (
      <div className="mt-3 border-t border-[#f0f0f0] pt-2">
        {sameDay.map(e => (
          <p key={e.id} className="text-xs text-[#aaa]">
            También hoy: <span className="font-semibold text-[#888]">{e.name}</span>
            {e.event_time && ` a las ${formatTime(e.event_time)}`}
          </p>
        ))}
      </div>
    )}
  </div>
)}
          {/* Encabezado lista */}
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#888]">
              Mis eventos · {events.length}
            </h2>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4-3 4 3M2 8l4 3 4-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {sortAsc ? 'Fecha ↑' : 'Fecha ↓'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Lista scrolleable ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">

          {loading ? (
            <div className="text-sm text-[#888]">Cargando...</div>

          ) : sortedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e0e0] px-6 py-16 text-center sm:py-20">
              <div className="mb-4 text-4xl">💍</div>
              <p className="text-sm text-[#888] sm:text-base">Aún no tienes eventos</p>
              <p className="mt-1 text-xs text-[#bbb] sm:text-sm">Crea tu primer evento para empezar</p>
            </div>

          ) : (
            <div className="flex flex-col gap-3">
              {sortedEvents.map(event => {
                const pct = confirmPct(event)
                const isNext = event.id === nextEvent?.id
                return (
                  <div
                    key={event.id}
                    onClick={() => window.location.href = `/events/${event.id}`}
                    className={`group cursor-pointer rounded-xl border bg-white px-4 py-4 transition hover:border-[#48C9B0] hover:shadow-[0_2px_12px_rgba(72,201,176,0.12)] active:scale-[0.99] sm:px-5 sm:py-4
                      ${isNext ? 'border-[#48C9B0]/40' : 'border-[#e8e8e8]'}`}
                  >
                    {/* Nombre + fecha */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1D1E20]">{event.name}</p>
                        <p className="mt-0.5 text-xs text-[#888]">
                          {formatDate(event.event_date)}
                          {event.event_time && ` · ${formatTime(event.event_time)}`}
                          {event.venue && ` · ${event.venue}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-lg text-[#ccc] transition group-hover:text-[#48C9B0]">›</span>
                    </div>

                    {/* Stats */}
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

                    {/* Barra de progreso */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-[#aaa]">Confirmados</span>
                        <span className="text-[10px] font-semibold text-[#48C9B0]">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
                        <div
                          className="h-full rounded-full bg-[#48C9B0] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}