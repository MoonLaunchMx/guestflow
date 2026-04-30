'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'diego.garza@moonlaunch.mx'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  plan: string
  created_at: string
  event_count: number
  guest_count: number
  last_event: string | null
  last_sign_in: string | null
}

interface GlobalStats {
  total_users: number
  free_users: number
  pro_users: number
  agency_users: number
  total_events: number
  total_guests: number
  confirmed: number
  pending: number
  declined: number
  new_users_7d: number
  new_events_7d: number
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`
  return `hace ${Math.floor(days / 30)} mes`
}

const PLAN_STYLES: Record<string, string> = {
  free:   'bg-[#f0f0f0] text-[#666]',
  pro:    'bg-[#e8faf6] text-[#1a7a60]',
  agency: 'bg-[#fff3cd] text-[#856404]',
}

export default function AdminPage() {
  const [loading, setLoading]       = useState(true)
  const [authed, setAuthed]         = useState(false)
  const [stats, setStats]           = useState<GlobalStats | null>(null)
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [search, setSearch]         = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortBy, setSortBy]         = useState<'created_at' | 'event_count' | 'guest_count'>('created_at')

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/dashboard'
        return
      }
      setAuthed(true)
      await loadData()
    }
    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: usersRaw } = await supabase
      .from('users')
      .select('id, email, full_name, plan, created_at')
      .order('created_at', { ascending: false })

    if (!usersRaw) { setLoading(false); return }

    const { data: eventsRaw } = await supabase
      .from('events')
      .select('id, user_id, name, created_at')

    const { data: guestsRaw } = await supabase
      .from('guests')
      .select('id, event_id, rsvp_status')

    // ── Último acceso desde la view que creamos ────────────────────────
    const { data: lastSeenRaw } = await supabase
      .from('user_last_seen')
      .select('id, last_sign_in_at')

    const events   = eventsRaw   || []
    const guests   = guestsRaw   || []
    const lastSeen = lastSeenRaw || []

    const enriched: AdminUser[] = usersRaw.map(u => {
      const userEvents   = events.filter(e => e.user_id === u.id)
      const userEventIds = userEvents.map(e => e.id)
      const userGuests   = guests.filter(g => userEventIds.includes(g.event_id))
      const lastEvent    = userEvents.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]?.created_at || null
      const lastSignIn   = lastSeen.find(ls => ls.id === u.id)?.last_sign_in_at || null

      return {
        ...u,
        plan: u.plan || 'free',
        event_count: userEvents.length,
        guest_count: userGuests.length,
        last_event:  lastEvent,
        last_sign_in: lastSignIn,
      }
    })

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    const globalStats: GlobalStats = {
      total_users:   usersRaw.length,
      free_users:    usersRaw.filter(u => (u.plan || 'free') === 'free').length,
      pro_users:     usersRaw.filter(u => u.plan === 'pro').length,
      agency_users:  usersRaw.filter(u => u.plan === 'agency').length,
      total_events:  events.length,
      total_guests:  guests.length,
      confirmed:     guests.filter(g => g.rsvp_status === 'confirmed').length,
      pending:       guests.filter(g => g.rsvp_status === 'pending').length,
      declined:      guests.filter(g => g.rsvp_status === 'declined').length,
      new_users_7d:  usersRaw.filter(u => u.created_at >= sevenDaysAgo).length,
      new_events_7d: events.filter(e => e.created_at >= sevenDaysAgo).length,
    }

    setStats(globalStats)
    setUsers(enriched)
    setLoading(false)
  }

  const filtered = users
    .filter(u => {
      const matchSearch = search === '' ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase())
      const matchPlan = planFilter === 'all' || u.plan === planFilter
      return matchSearch && matchPlan
    })
    .sort((a, b) => {
      if (sortBy === 'event_count') return b.event_count - a.event_count
      if (sortBy === 'guest_count') return b.guest_count - a.guest_count
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function changePlan(userId: string, newPlan: string) {
    await supabase.from('users').update({ plan: newPlan }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
    if (stats) {
      const updated = users.map(u => u.id === userId ? { ...u, plan: newPlan } : u)
      setStats({
        ...stats,
        free_users:   updated.filter(u => u.plan === 'free').length,
        pro_users:    updated.filter(u => u.plan === 'pro').length,
        agency_users: updated.filter(u => u.plan === 'agency').length,
      })
    }
  }

  if (!authed && !loading) return null

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f8f5f0]">
      <div className="text-center">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#48C9B0] border-t-transparent mx-auto" />
        <p className="text-sm text-[#888]">Cargando datos...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f5f0]">

      {/* Header */}
      <div className="border-b border-[#e8e8e8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#48C9B0]">
              <span className="text-xs font-bold text-white">GF</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1D1E20]">Anfiora Admin</h1>
              <p className="text-xs text-[#888]">Panel interno — solo para ti</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#555] transition hover:bg-[#f5f5f5]"
            >
              ↻ Actualizar
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#555] transition hover:bg-[#f5f5f5]"
            >
              ← Volver al app
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* Stats globales */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
              <p className="text-xs text-[#888]">Usuarios totales</p>
              <p className="mt-1 text-2xl font-bold text-[#1D1E20]">{stats.total_users}</p>
              <p className="mt-1 text-xs text-[#48C9B0]">+{stats.new_users_7d} esta semana</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
              <p className="text-xs text-[#888]">Por plan</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#888]">Free</span>
                  <span className="text-xs font-semibold text-[#1D1E20]">{stats.free_users}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#48C9B0]">Pro</span>
                  <span className="text-xs font-semibold text-[#1D1E20]">{stats.pro_users}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#f59e0b]">Agency</span>
                  <span className="text-xs font-semibold text-[#1D1E20]">{stats.agency_users}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
              <p className="text-xs text-[#888]">Eventos totales</p>
              <p className="mt-1 text-2xl font-bold text-[#1D1E20]">{stats.total_events}</p>
              <p className="mt-1 text-xs text-[#48C9B0]">+{stats.new_events_7d} esta semana</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
              <p className="text-xs text-[#888]">Invitados totales</p>
              <p className="mt-1 text-2xl font-bold text-[#1D1E20]">{stats.total_guests}</p>
              <p className="mt-1 text-xs text-[#888]">en toda la plataforma</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 sm:col-span-2">
              <p className="mb-2 text-xs text-[#888]">RSVPs globales</p>
              <div className="space-y-1.5">
                <div>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-[#2a7a50]">Confirmados</span>
                    <span className="font-medium text-[#1D1E20]">{stats.confirmed}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#f0f0f0]">
                    <div className="h-1.5 rounded-full bg-[#48C9B0]" style={{ width: stats.total_guests ? `${Math.round(stats.confirmed / stats.total_guests * 100)}%` : '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-[#b8860b]">Pendientes</span>
                    <span className="font-medium text-[#1D1E20]">{stats.pending}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#f0f0f0]">
                    <div className="h-1.5 rounded-full bg-[#f59e0b]" style={{ width: stats.total_guests ? `${Math.round(stats.pending / stats.total_guests * 100)}%` : '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-[#cc3333]">Declinados</span>
                    <span className="font-medium text-[#1D1E20]">{stats.declined}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#f0f0f0]">
                    <div className="h-1.5 rounded-full bg-[#ef4444]" style={{ width: stats.total_guests ? `${Math.round(stats.declined / stats.total_guests * 100)}%` : '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="rounded-xl border border-[#e8e8e8] bg-white">

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e8e8e8] px-4 py-3">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-sm text-[#1D1E20] outline-none focus:border-[#48C9B0] min-w-[180px]"
            />
            <div className="flex gap-2">
              {['all', 'free', 'pro', 'agency'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlanFilter(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    planFilter === p
                      ? 'bg-[#48C9B0] text-white'
                      : 'border border-[#e0e0e0] text-[#555] hover:bg-[#f5f5f5]'
                  }`}
                >
                  {p === 'all' ? 'Todos' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#555] outline-none"
            >
              <option value="created_at">Más recientes</option>
              <option value="event_count">Más eventos</option>
              <option value="guest_count">Más invitados</option>
            </select>
            <span className="text-xs text-[#888]">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0f0f0] text-left">
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Usuario</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Plan</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Eventos</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Invitados</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Último acceso</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Último evento</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Registro</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Cambiar plan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#888]">
                      No hay usuarios que coincidan
                    </td>
                  </tr>
                ) : filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-[#f8f8f8] transition hover:bg-[#fafafa] ${i === filtered.length - 1 ? 'border-none' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1D1E20]">{u.full_name || '—'}</p>
                      <p className="text-xs text-[#888]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STYLES[u.plan] || PLAN_STYLES.free}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#1D1E20]">{u.event_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#1D1E20]">{u.guest_count}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#888]">
                      {u.last_sign_in ? timeAgo(u.last_sign_in) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#888]">
                      {u.last_event ? timeAgo(u.last_event) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#888]">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        onChange={e => changePlan(u.id, e.target.value)}
                        className="rounded-lg border border-[#e0e0e0] px-2 py-1 text-xs text-[#555] outline-none hover:border-[#48C9B0]"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="agency">agency</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-[#f0f0f0] md:hidden">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#888]">No hay usuarios que coincidan</p>
            ) : filtered.map(u => (
              <div key={u.id} className="px-4 py-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[#1D1E20]">{u.full_name || '—'}</p>
                    <p className="text-xs text-[#888]">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STYLES[u.plan] || PLAN_STYLES.free}`}>
                    {u.plan}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-[#888]">
                  <span>{u.event_count} eventos</span>
                  <span>{u.guest_count} invitados</span>
                  <span>Acceso: {u.last_sign_in ? timeAgo(u.last_sign_in) : '—'}</span>
                  <span>Registro: {formatDate(u.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#888]">Cambiar plan:</span>
                  <select
                    value={u.plan}
                    onChange={e => changePlan(u.id, e.target.value)}
                    className="rounded-lg border border-[#e0e0e0] px-2 py-1 text-xs text-[#555] outline-none"
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="agency">agency</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}