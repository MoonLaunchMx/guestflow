'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const EVENT_TYPES = [
  { value: 'boda',        label: '💍 Boda' },
  { value: 'cumpleanos',  label: '🎂 Cumpleaños' },
  { value: 'fiesta',      label: '🎉 Fiesta' },
  { value: 'corporativo', label: '💼 Corporativo' },
  { value: 'bautizo',     label: '🕊️ Bautizo' },
  { value: 'otro',        label: '📅 Otro' },
]

export default function ConfiguracionPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [eventType, setEventType] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [venue, setVenue] = useState('')
  const [address, setAddress] = useState('')
  const [templates, setTemplates] = useState<string[]>(['', '', '', '', ''])

  useEffect(() => { loadEvent() }, [])

  const loadEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    if (data) {
      setName(data.name || '')
      setEventType(data.event_type || '')
      setEventDate(data.event_date ? data.event_date.split('T')[0] : '')
      setEventTime(data.event_time || '')
      setVenue(data.venue || '')
      setAddress(data.address || '')
      if (Array.isArray(data.message_templates)) {
        setTemplates([...data.message_templates, '', '', '', '', ''].slice(0, 5))
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!name) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(''); setSaved(false)
    const { error: err } = await supabase.from('events').update({
      name, event_type: eventType || null, event_date: eventDate || null,
      event_time: eventTime || null, venue: venue || null,
      address: address || null, message_templates: templates,
    }).eq('id', id)
    if (err) { setError('Error: ' + err.message); setSaving(false); return }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateTemplate = (i: number, value: string) =>
    setTemplates(prev => prev.map((t, idx) => idx === i ? value : t))

  if (loading) return <div style={{ padding: '40px', color: '#666' }}>Cargando...</div>

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: '#fff', border: '1px solid #d0d0d0',
    borderRadius: '7px', color: '#1D1E20',
    fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '12px', fontWeight: '500' as const,
    color: '#555', marginBottom: '5px',
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff' }}>
      <div style={{ padding: '28px 32px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0', color: '#1D1E20' }}>
              Configuración del evento
            </h1>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
              Datos generales y plantillas de WhatsApp
            </p>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: '10px 24px',
              background: saved ? '#f0fdfb' : saving ? '#a0e0d8' : '#48C9B0',
              border: saved ? '1px solid #48C9B0' : 'none',
              borderRadius: '8px', color: saved ? '#1a9e88' : '#fff',
              fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap' as const,
            }}>
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', color: '#cc3333', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Dos columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── COLUMNA IZQUIERDA: Datos del evento ── */}
          <div style={{ background: '#fafafa', padding: '20px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#1D1E20', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📋 Datos del evento
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Boda Ana & Carlos" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tipo de evento</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {EVENT_TYPES.map(type => (
                    <button key={type.value} onClick={() => setEventType(type.value)}
                      style={{
                        padding: '8px 10px',
                        background: eventType === type.value ? '#f0fdfb' : '#fff',
                        border: `1px solid ${eventType === type.value ? '#48C9B0' : '#e0e0e0'}`,
                        borderRadius: '7px',
                        color: eventType === type.value ? '#1a9e88' : '#444',
                        fontSize: '12px', cursor: 'pointer', textAlign: 'left' as const,
                        fontWeight: eventType === type.value ? '600' : '400',
                      }}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'light' }} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'light' }} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Venue</label>
                <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
                  placeholder="Hacienda San Miguel" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Dirección exacta</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Carr. Saltillo-Monterrey Km 4.5" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: Plantillas WhatsApp ── */}
          <div style={{ background: '#fafafa', padding: '20px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#1D1E20', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💬 Plantillas de WhatsApp
            </h2>
            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
              Hasta 5 mensajes para enviar a tus invitados
            </p>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '14px', padding: '6px 10px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '6px', fontFamily: 'monospace' }}>
              {'{nombre} · {evento} · {fecha} · {hora} · {venue}'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {templates.map((template, i) => (
                <div key={i}>
                  <label style={labelStyle}>Plantilla {i + 1}</label>
                  <textarea value={template} onChange={e => updateTemplate(i, e.target.value)}
                    placeholder={i === 0
                      ? 'Hola {nombre}, te esperamos en {evento} el {fecha} a las {hora} 🎉'
                      : `Plantilla ${i + 1}...`}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: '1.4', fontFamily: 'system-ui' }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}