'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewGuest() {
  const { id } = useParams()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name) { setError('El nombre es obligatorio'); return }
    setLoading(true); setError('')
    const { error } = await supabase.from('guests').insert({
      event_id: id, name, phone: phone || null, email: email || null,
      party_size: partySize, notes: notes || null, rsvp_status: 'pending',
    })
    if (error) { setError('Error al agregar invitado: ' + error.message); setLoading(false) }
    else {
      await supabase.rpc('increment_guests', { event_id_input: id })
      window.location.href = `/events/${id}/guests`
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', background: 'var(--surface)',
    border: '1px solid var(--border-strong)', borderRadius: '8px',
    color: 'var(--text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif', color: 'var(--text)' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Georgia, serif', color: 'var(--text)' }}>
          Guest<span style={{ color: 'var(--accent)' }}>Flow</span>
        </div>
        <button
          onClick={() => window.location.href = `/events/${id}/guests`}
          style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Lista de invitados
        </button>
      </div>

      <div style={{ padding: '40px', maxWidth: '520px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Agregar invitado</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-sec)', marginBottom: '32px' }}>Solo el nombre es obligatorio</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Nombre *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ana García" style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              WhatsApp <span style={{ color: 'var(--text-dim)' }}>(opcional)</span>
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 81 1234 5678" style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Email <span style={{ color: 'var(--text-dim)' }}>(opcional)</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Número de personas en el grupo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setPartySize(p => Math.max(1, p - 1))}
                style={{ width: '36px', height: '36px', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text)', fontSize: '18px', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: '20px', fontWeight: '700', minWidth: '24px', textAlign: 'center', color: 'var(--text)' }}>{partySize}</span>
              <button onClick={() => setPartySize(p => p + 1)}
                style={{ width: '36px', height: '36px', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text)', fontSize: '18px', cursor: 'pointer' }}>+</button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Notas <span style={{ color: 'var(--text-dim)' }}>(opcional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mesa preferida, restricciones alimentarias..." rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '20px', padding: '12px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: '8px', color: 'var(--error-text)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={() => window.location.href = `/events/${id}/guests`}
            style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '15px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleCreate} disabled={loading}
            style={{ flex: 2, padding: '14px', background: loading ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', borderRadius: '8px', color: 'var(--text)', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Guardando...' : 'Agregar invitado'}
          </button>
        </div>
      </div>
    </div>
  )
}
