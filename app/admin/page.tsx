'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Mail, Ban, Trash2, CheckCircle } from 'lucide-react'

const ADMIN_EMAIL = 'diego.garza@moonlaunch.mx'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  plan: string
  created_at: string
  event_count: number
  guest_count: number
  last_sign_in: string | null
  events: { id: string; name: string; created_at: string; guest_count: number }[]
  banned: boolean
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
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return 'hace ' + days + ' dias'
  if (days < 30) return 'hace ' + Math.floor(days / 7) + ' sem'
  return 'hace ' + Math.floor(days / 30) + ' mes'
}

const PLAN_STYLES: Record<string, string> = {
  free:   'bg-[#f0f0f0] text-[#666]',
  pro:    'bg-[#e8faf6] text-[#1a7a60]',
  agency: 'bg-[#fff3cd] text-[#856404]',
}

export default function AdminPage() {
  const [loading, setLoading]             = useState(true)
  const [authed, setAuthed]               = useState(false)
  const [sessionToken, setSessionToken]   = useState<string | null>(null)
  const [stats, setStats]                 = useState<GlobalStats | null>(null)
  const [users, setUsers]                 = useState<AdminUser[]>([])
  const [search, setSearch]               = useState('')
  const [planFilter, setPlanFilter]       = useState<string>('all')
  const [sortBy, setSortBy]               = useState<'created_at' | 'event_count' | 'guest_count'>('created_at')
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) {
        window.location.href = '/dashboard'
        return
      }
      setSessionToken(session.access_token)
      setAuthed(true)
      await loadData(session.access_token)
    }
    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData(token: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      if (!res.ok) throw new Error('Error cargando datos')
      const { users: usersRaw, events, guests } = await res.json()

      const enriched: AdminUser[] = usersRaw.map((u: { id: string; email: string; full_name: string | null; plan: string; created_at: string }) => {
        const userEvents   = events.filter((e: { user_id: string }) => e.user_id === u.id)
        const userEventIds = userEvents.map((e: { id: string }) => e.id)
        const userGuests   = guests.filter((g: { event_id: string }) => userEventIds.includes(g.event_id))

        const eventsWithGuests = userEvents.map((e: { id: string; name: string; created_at: string }) => ({
          ...e,
          guest_count: guests.filter((g: { event_id: string }) => g.event_id === e.id).length
        }))

        return {
          ...u,
          plan: u.plan || 'free',
          event_count:  userEvents.length,
          guest_count:  userGuests.length,
          last_sign_in: null,
          events:       eventsWithGuests,
          banned:       false,
        }
      })

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

      const globalStats: GlobalStats = {
        total_users:   usersRaw.length,
        free_users:    usersRaw.filter((u: { plan: string }) => (u.plan || 'free') === 'free').length,
        pro_users:     usersRaw.filter((u: { plan: string }) => u.plan === 'pro').length,
        agency_users:  usersRaw.filter((u: { plan: string }) => u.plan === 'agency').length,
        total_events:  events.length,
        total_guests:  guests.length,
        confirmed:     guests.filter((g: { rsvp_status: string }) => g.rsvp_status === 'confirmed').length,
        pending:       guests.filter((g: { rsvp_status: string }) => g.rsvp_status === 'pending').length,
        declined:      guests.filter((g: { rsvp_status: string }) => g.rsvp_status === 'declined').length,
        new_users_7d:  usersRaw.filter((u: { created_at: string }) => u.created_at >= sevenDaysAgo).length,
        new_events_7d: events.filter((e: { created_at: string }) => e.created_at >= sevenDaysAgo).length,
      }

      setStats(globalStats)
      setUsers(enriched)
    } catch (e) {
      showToast('Error cargando datos', false)
    } finally {
      setLoading(false)
    }
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
  }

  async function callAdminAction(userId: string, action: 'delete' | 'ban' | 'unban') {
    const token = sessionToken
    if (!token) return
    setActionLoading(userId + action)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ userId, action })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (action === 'delete') {
        setUsers(prev => prev.filter(u => u.id !== userId))
        showToast('Usuario eliminado')
      } else if (action === 'ban') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true } : u))
        showToast('Usuario suspendido')
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false } : u))
        showToast('Usuario reactivado')
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error desconocido', false)
    } finally {
      setActionLoading(null)
    }
  }

  function confirmDelete(u: AdminUser) {
    if (window.confirm('Eliminar a ' + (u.full_name || u.email) + '?\n\nEsto borra su cuenta y todos sus datos. No se puede deshacer.')) {
      callAdminAction(u.id, 'delete')
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

      {toast && (
        <div className={'fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ' + (toast.ok ? 'bg-[#48C9B0]' : 'bg-red-500')}>
          {toast.msg}
        </div>
      )}

      <div className="border-b border-[#e8e8e8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#48C9B0]">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1D1E20]">Anfiora Admin</h1>
              <p className="text-xs text-[#888]">Panel interno — solo para ti</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => sessionToken && loadData(sessionToken)} className="rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#555] transition hover:bg-[#f5f5f5]">
              Actualizar
            </button>
            <button onClick={() => { window.location.href = '/dashboard' }} className="rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#555] transition hover:bg-[#f5f5f5]">
              Volver al app
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
              <p className="text-xs text-[#888]">Usuarios totales</p>
              <p className="mt-1 text-2xl font-bold text-[#1D1E20]">{stats.total_users}</p>
              <p className="mt-1 text-xs text-[#48C9B0]">{'+' + stats.new_users_7d + ' esta semana'}</p>
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
              <p className="mt-1 text-xs text-[#48C9B0]">{'+' + stats.new_events_7d + ' esta semana'}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
              <p className="text-xs text-[#888]">Invitados totales</p>
              <p className="mt-1 text-2xl font-bold text-[#1D1E20]">{stats.total_guests}</p>
              <p className="mt-1 text-xs text-[#888]">en toda la plataforma</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 sm:col-span-2">
              <p className="mb-2 text-xs text-[#888]">RSVPs globales</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Confirmados', val: stats.confirmed, color: 'bg-[#48C9B0]', text: 'text-[#2a7a50]' },
                  { label: 'Pendientes',  val: stats.pending,   color: 'bg-[#f59e0b]', text: 'text-[#b8860b]' },
                  { label: 'Declinados',  val: stats.declined,  color: 'bg-[#ef4444]', text: 'text-[#cc3333]' },
                ].map(({ label, val, color, text }) => (
                  <div key={label}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className={text}>{label}</span>
                      <span className="font-medium text-[#1D1E20]">{val}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f0f0f0]">
                      <div className={'h-1.5 rounded-full ' + color} style={{ width: stats.total_guests ? Math.round(val / stats.total_guests * 100) + '%' : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#e8e8e8] bg-white">
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
                  className={'rounded-lg px-3 py-1.5 text-xs font-medium transition ' + (planFilter === p ? 'bg-[#48C9B0] text-white' : 'border border-[#e0e0e0] text-[#555] hover:bg-[#f5f5f5]')}
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
              <option value="created_at">Mas recientes</option>
              <option value="event_count">Mas eventos</option>
              <option value="guest_count">Mas invitados</option>
            </select>
            <span className="text-xs text-[#888]">{filtered.length + ' usuario' + (filtered.length !== 1 ? 's' : '')}</span>
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0f0f0] text-left">
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Usuario</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Plan</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Eventos</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Invitados</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Registro</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Cambiar plan</th>
                  <th className="px-4 py-3 text-xs font-medium text-[#888]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[#888]">Sin resultados</td></tr>
                ) : filtered.map(u => (
                  <>
                    <tr
                      key={u.id}
                      className={'border-b border-[#f8f8f8] transition hover:bg-[#fafafa] cursor-pointer' + (u.banned ? ' opacity-50' : '')}
                      onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedId === u.id
                            ? <ChevronUp size={14} className="text-[#aaa] shrink-0" />
                            : <ChevronDown size={14} className="text-[#aaa] shrink-0" />
                          }
                          <div>
                            <p className="font-medium text-[#1D1E20]">{u.full_name || '—'}</p>
                            <p className="text-xs text-[#888]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + (PLAN_STYLES[u.plan] || PLAN_STYLES.free)}>
                          {u.plan}
                        </span>
                        {u.banned && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">suspendido</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1D1E20]">{u.event_count}</td>
                      <td className="px-4 py-3 font-medium text-[#1D1E20]">{u.guest_count}</td>
                      <td className="px-4 py-3 text-xs text-[#888]">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            title="Enviar email"
                            onClick={() => { window.location.href = 'mailto:' + u.email }}
                            className="rounded-lg p-1.5 text-[#888] transition hover:bg-[#f0f0f0] hover:text-[#1D1E20]"
                          >
                            <Mail size={14} />
                          </button>
                          {u.banned ? (
                            <button
                              title="Reactivar"
                              disabled={!!actionLoading}
                              onClick={() => callAdminAction(u.id, 'unban')}
                              className="rounded-lg p-1.5 text-[#48C9B0] transition hover:bg-[#e8faf6]"
                            >
                              <CheckCircle size={14} />
                            </button>
                          ) : (
                            <button
                              title="Suspender"
                              disabled={!!actionLoading}
                              onClick={() => callAdminAction(u.id, 'ban')}
                              className="rounded-lg p-1.5 text-[#f59e0b] transition hover:bg-[#fff3cd]"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          <button
                            title="Eliminar usuario"
                            disabled={!!actionLoading}
                            onClick={() => confirmDelete(u)}
                            className="rounded-lg p-1.5 text-[#ef4444] transition hover:bg-[#fee2e2]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedId === u.id && (
                      <tr key={u.id + '-exp'}>
                        <td colSpan={7} className="bg-[#fafafa] px-8 py-4">
                          {u.events.length === 0 ? (
                            <p className="text-xs text-[#aaa]">Sin eventos creados</p>
                          ) : (
                            <div>
                              <p className="mb-2 text-xs font-medium text-[#888]">{'Eventos (' + u.events.length + ')'}</p>
                              <div className="flex flex-wrap gap-2">
                                {u.events
                                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map(ev => (
                                    <div key={ev.id} className="rounded-lg border border-[#e8e8e8] bg-white px-3 py-2">
                                      <p className="text-xs font-medium text-[#1D1E20]">{ev.name}</p>
                                      <p className="text-xs text-[#aaa]">{ev.guest_count + ' invitados · ' + formatDate(ev.created_at)}</p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-[#f0f0f0] md:hidden">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#888]">Sin resultados</p>
            ) : filtered.map(u => (
              <div key={u.id} className={u.banned ? 'opacity-50' : ''}>
                <div className="px-4 py-4 cursor-pointer" onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[#1D1E20]">{u.full_name || '—'}</p>
                      <p className="text-xs text-[#888]">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + (PLAN_STYLES[u.plan] || PLAN_STYLES.free)}>{u.plan}</span>
                      {expandedId === u.id ? <ChevronUp size={14} className="text-[#aaa]" /> : <ChevronDown size={14} className="text-[#aaa]" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#888]">
                    <span>{u.event_count + ' eventos'}</span>
                    <span>{u.guest_count + ' invitados'}</span>
                    <span>{'Registro: ' + formatDate(u.created_at)}</span>
                  </div>
                </div>

                {expandedId === u.id && (
                  <div className="border-t border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
                    {u.events.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-xs font-medium text-[#888]">Eventos</p>
                        <div className="space-y-1.5">
                          {u.events.map(ev => (
                            <div key={ev.id} className="rounded-lg border border-[#e8e8e8] bg-white px-3 py-2">
                              <p className="text-xs font-medium text-[#1D1E20]">{ev.name}</p>
                              <p className="text-xs text-[#aaa]">{ev.guest_count + ' invitados · ' + formatDate(ev.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={u.plan}
                        onChange={e => changePlan(u.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="rounded-lg border border-[#e0e0e0] px-2 py-1 text-xs text-[#555] outline-none"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="agency">agency</option>
                      </select>
                      <button onClick={() => { window.location.href = 'mailto:' + u.email }} className="rounded-lg border border-[#e0e0e0] p-1.5 text-[#888]">
                        <Mail size={14} />
                      </button>
                      {u.banned ? (
                        <button onClick={() => callAdminAction(u.id, 'unban')} className="rounded-lg border border-[#e0e0e0] p-1.5 text-[#48C9B0]">
                          <CheckCircle size={14} />
                        </button>
                      ) : (
                        <button onClick={() => callAdminAction(u.id, 'ban')} className="rounded-lg border border-[#e0e0e0] p-1.5 text-[#f59e0b]">
                          <Ban size={14} />
                        </button>
                      )}
                      <button onClick={() => confirmDelete(u)} className="rounded-lg border border-[#e0e0e0] p-1.5 text-[#ef4444]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}