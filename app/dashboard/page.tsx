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

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => { checkAuth(); loadEvents() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    setUserEmail(user.email || '')
  }

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, venue, total_guests')
      .order('event_date', { ascending: true })
    if (!error && data) setEvents(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'system-ui, sans-serif', color: '#1D1E20' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #e8e8e8', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', background: '#ffffff' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#1D1E20' }}>
          Guest<span style={{ color: '#48C9B0' }}>Flow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>{userEmail}</span>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', color: '#1D1E20' }}>Mis eventos</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
              {events.length} evento{events.length !== 1 ? 's' : ''} registrado{events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => window.location.href = '/events/new'}
            style={{ padding: '10px 20px', background: '#48C9B0', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            + Nuevo evento
          </button>
        </div>

        {loading ? (
          <div style={{ color: '#888', fontSize: '14px' }}>Cargando...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed #e0e0e0', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>💍</div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>Aún no tienes eventos</div>
            <div style={{ fontSize: '13px', color: '#bbb' }}>Crea tu primer evento para empezar a gestionar invitados</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map(event => (
              <div key={event.id}
                onClick={() => window.location.href = `/events/${event.id}`}
                style={{ background: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#48C9B0'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(72,201,176,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#1D1E20' }}>{event.name}</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>
                    {formatDate(event.event_date)}{event.venue ? ` · ${event.venue}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#48C9B0' }}>{event.total_guests}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>invitados</div>
                  </div>
                  <div style={{ color: '#ccc', fontSize: '18px' }}>›</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}