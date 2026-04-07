'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const EVENT_TYPES = [
  { value: 'boda',        label: '💍 Boda' },
  { value: 'cumpleanos',  label: '🎂 Cumpleaños' },
  { value: 'fiesta',      label: '🎉 Fiesta' },
  { value: 'corporativo', label: '💼 Evento corporativo' },
  { value: 'bautizo',     label: '🕊️ Bautizo / Primera comunión' },
  { value: 'otro',        label: '📅 Otro' },
]

export default function NewEvent() {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [eventType, setEventType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name || !date || !eventType) {
      setError('El nombre, fecha y tipo de evento son obligatorios')
      return
    }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { error } = await supabase.from('events').insert({
      user_id: user.id, name, event_date: date,
      venue: venue || null, event_type: eventType, total_guests: 0,
    })
    if (error) { setError('Error: ' + error.message); setLoading(false) }
    else window.location.href = '/dashboard'
  }

  const inp = {
    width: '100%', padding: '12px 14px', background: '#f8f8f8',
    border: '1px solid #e0e0e0', borderRadius: '8px',
    color: '#1D1E20', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'system-ui, sans-serif', color: '#1D1E20' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #e8e8e8', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', background: '#ffffff' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Georgia, serif' }}>
          Guest<span style={{ color: '#48C9B0' }}>Flow</span>
        </div>
        <button onClick={() => window.location.href = '/dashboard'}
          style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>
          ← Volver
        </button>
      </div>

      <div style={{ padding: '40px', maxWidth: '520px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#1D1E20' }}>Nuevo evento</h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '32px' }}>Ingresa los datos básicos del evento</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '10px' }}>Tipo de evento *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {EVENT_TYPES.map(type => (
                <button key={type.value} onClick={() => setEventType(type.value)}
                  style={{
                    padding: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                    background: eventType === type.value ? '#f0fdfb' : '#f8f8f8',
                    border: `1px solid ${eventType === type.value ? '#48C9B0' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    color: eventType === type.value ? '#1a9e88' : '#555',
                    fontWeight: eventType === type.value ? '600' : '400',
                  }}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Nombre del evento *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Boda Ana & Carlos" style={inp} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Fecha del evento *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, colorScheme: 'light' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Venue <span style={{ color: '#ccc', fontWeight: '400' }}>(opcional)</span></label>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Hacienda San Miguel" style={inp} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '20px', padding: '12px', background: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', color: '#cc3333', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={() => window.location.href = '/dashboard'}
            style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#888', fontSize: '15px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleCreate} disabled={loading}
            style={{ flex: 2, padding: '14px', background: loading ? '#a0e0d8' : '#48C9B0', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creando...' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  )
}