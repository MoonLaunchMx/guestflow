'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
export const dynamic = 'force-dynamic'

type Event = {
  id: string
  name: string
  event_date: string
  venue: string | null
  total_guests: number
}

type Stats = {
  activeEvents: number
  totalGuests: number
  confirmed: number
  declined: number
  pending: number
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<Stats>({
    activeEvents: 0,
    totalGuests: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => { checkAuth(); loadData() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    setUserEmail(user.email || '')
  }

  const loadData = async () => {
    const [{ data: eventsData, error: eventsError }, { data: guestsData }] = await Promise.all([
      supabase.from('events').select('id, name, event_date, venue, total_guests').order('event_date', { ascending: true }),
      supabase.from('guests').select('rsvp_status'),
    ])

    if (!eventsError && eventsData) {
      setEvents(eventsData)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const activeEvents = eventsData.filter(e => e.event_date && new Date(e.event_date) >= today).length
      const confirmed    = guestsData?.filter(g => g.rsvp_status === 'confirmed').length ?? 0
      const declined     = guestsData?.filter(g => g.rsvp_status === 'declined').length ?? 0
      const pending      = guestsData?.filter(g => g.rsvp_status === 'pending').length ?? 0
      const totalGuests  = guestsData?.length ?? 0

      setStats({ activeEvents, totalGuests, confirmed, declined, pending })
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0
    return sortAsc ? dateA - dateB : dateB - dateA
  })

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8f8f8] font-sans text-[#1D1E20]">

      {/* ── Shimmer keyframe ── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .shimmer-btn {
          position: relative;
          overflow: hidden;
          background: #48C9B0;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.45) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          background-position: -200% center;
          transition: none;
        }
        .shimmer-btn:hover::after {
          animation: shimmer 1.2s ease forwards;
        }
        .shimmer-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(72,201,176,0.4);
        }
        .shimmer-btn:active {
          transform: scale(0.97);
          box-shadow: none;
        }
      `}</style>

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

      {/* ── Zona fija: título + métricas ── */}
      <div className="shrink-0 bg-[#f8f8f8]">
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">

          {/* Título + botones */}
          <div className="mb-5 flex items-center justify-between sm:mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1D1E20] sm:text-2xl">Dashboard</h1>
              <p className="mt-0.5 text-xs text-[#888] sm:text-sm">Resumen general de tus eventos</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* WhatsApp Hub — shimmer */}
              <button
                onClick={() => window.location.href = '/mensajes'}
                className="shimmer-btn rounded-lg px-3 py-2 text-sm font-semibold text-white sm:px-4 sm:py-2.5"
              >
                <span className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="hidden sm:inline">WhatsApp Hub</span>
                  <span className="sm:hidden">WA Hub</span>
                </span>
              </button>

              {/* Nuevo evento */}
              <button
                onClick={() => window.location.href = '/events/new'}
                className="rounded-lg bg-[#48C9B0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3ab89f] active:scale-95 sm:px-5 sm:py-2.5"
              >
                <span className="sm:hidden">+ Nuevo</span>
                <span className="hidden sm:inline">+ Nuevo evento</span>
              </button>
            </div>
          </div>

          {/* Métricas */}
          {!loading && (
            <div className="mb-5 sm:mb-6">
              <div className="mb-3 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-xs text-[#888] sm:text-sm">Eventos activos</p>
                  <p className="mt-1 text-3xl font-bold text-[#1D1E20] sm:text-4xl">{stats.activeEvents}</p>
                </div>
                <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-xs text-[#888] sm:text-sm">Total invitados</p>
                  <p className="mt-1 text-3xl font-bold text-[#1D1E20] sm:text-4xl">{stats.totalGuests}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-xs text-[#888] sm:text-sm">Confirmados</p>
                  <p className="mt-1 text-2xl font-bold text-[#48C9B0] sm:text-3xl">{stats.confirmed}</p>
                </div>
                <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-xs text-[#888] sm:text-sm">Pendientes</p>
                  <p className="mt-1 text-2xl font-bold text-[#F5A623] sm:text-3xl">{stats.pending}</p>
                </div>
                <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 sm:px-5 sm:py-5">
                  <p className="text-xs text-[#888] sm:text-sm">Cancelados</p>
                  <p className="mt-1 text-2xl font-bold text-[#E05C5C] sm:text-3xl">{stats.declined}</p>
                </div>
              </div>
            </div>
          )}

          {/* Encabezado lista + botón orden */}
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

      {/* ── Zona scrolleable: solo la lista ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">

          {loading ? (
            <div className="text-sm text-[#888]">Cargando...</div>

          ) : sortedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e0e0] px-6 py-16 text-center sm:py-20">
              <div className="mb-4 text-4xl">💍</div>
              <p className="text-sm text-[#888] sm:text-base">Aún no tienes eventos</p>
              <p className="mt-1 text-xs text-[#bbb] sm:text-sm">Crea tu primer evento para empezar a gestionar invitados</p>
            </div>

          ) : (
            <div className="flex flex-col gap-3">
              {sortedEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => window.location.href = `/events/${event.id}`}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 transition hover:border-[#48C9B0] hover:shadow-[0_2px_12px_rgba(72,201,176,0.12)] active:scale-[0.99] sm:px-6 sm:py-5"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="truncate text-sm font-semibold text-[#1D1E20] sm:text-base">{event.name}</p>
                    <p className="mt-0.5 text-xs text-[#888] sm:text-sm">
                      {formatDate(event.event_date)}
                      {event.venue && (
                        <>
                          <span className="hidden sm:inline"> · {event.venue}</span>
                          <span className="block sm:hidden">{event.venue}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#48C9B0] sm:text-xl">{event.total_guests}</p>
                      <p className="text-[10px] text-[#999] sm:text-xs">invitados</p>
                    </div>
                    <span className="text-lg text-[#ccc] transition group-hover:text-[#48C9B0]">›</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}