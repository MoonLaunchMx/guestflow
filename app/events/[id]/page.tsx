'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Event = {
  id: string
  name: string
  event_date: string
  venue: string | null
  event_type: string | null
  total_guests: number
  status: string
  event_time: string | null
  message_templates: string[]
}

type Guest = {
  id: string
  name: string
  phone: string | null
  email: string | null
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  party_size: number
  notes: string | null
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pendiente',  color: '#b8860b', bg: '#fffbf0', border: '#f0d080' },
  confirmed: { label: 'Confirmado', color: '#2a7a50', bg: '#f0fff6', border: '#a0e0c0' },
  declined:  { label: 'Declinó',    color: '#cc3333', bg: '#fff0f0', border: '#ffc0c0' },
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  boda:        '💍 Boda',
  cumpleanos:  '🎂 Cumpleaños',
  fiesta:      '🎉 Fiesta',
  corporativo: '💼 Evento corporativo',
  bautizo:     '🕊️ Bautizo / Primera comunión',
  otro:        '📅 Otro',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#f8f8f8', border: '1px solid #e0e0e0',
  borderRadius: '8px', color: '#1D1E20',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

export default function EventPage() {
  const { id } = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [filtered, setFiltered] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('all')

  const [showModal, setShowModal] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvError, setCsvError] = useState('')
  const [csvSuccess, setCsvSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPartySize, setEditPartySize] = useState(1)
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const bulkMenuRef = useRef<HTMLDivElement>(null)

  const [showWaMenu, setShowWaMenu] = useState<string | null>(null)
  const waMenuRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { loadEvent(); loadGuests() }, [])

  useEffect(() => {
    let result = guests
    if (filter !== 'all') result = result.filter(g => g.rsvp_status === filter)
    if (search) result = result.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [guests, filter, search])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node))
        setShowBulkMenu(false)
      if (waMenuRef.current && !waMenuRef.current.contains(e.target as Node))
        setShowWaMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    if (data) setEvent(data)
  }

  const loadGuests = async () => {
    const { data } = await supabase.from('guests').select('*').eq('event_id', id).order('name')
    if (data) setGuests(data)
    setLoading(false)
  }

  const updateStatus = async (guestId: string, status: 'pending' | 'confirmed' | 'declined') => {
    await supabase.from('guests').update({ rsvp_status: status }).eq('id', guestId)
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, rsvp_status: status } : g))
  }

  const deleteGuest = async (guestId: string) => {
    if (!confirm('¿Eliminar este invitado?')) return
    await supabase.from('guests').delete().eq('id', guestId)
    await supabase.rpc('decrement_guests', { event_id_input: id })
    setGuests(prev => prev.filter(g => g.id !== guestId))
    setEvent(prev => prev ? { ...prev, total_guests: Math.max(0, prev.total_guests - 1) } : prev)
    setSelected(prev => { const n = new Set(prev); n.delete(guestId); return n })
  }

  const openEdit = (guest: Guest) => {
    setEditGuest(guest)
    setEditName(guest.name)
    setEditPhone(guest.phone || '')
    setEditEmail(guest.email || '')
    setEditPartySize(guest.party_size)
    setEditNotes(guest.notes || '')
    setEditError('')
  }

  const handleEditSave = async () => {
    if (!editGuest) return
    if (!editName) { setEditError('El nombre es obligatorio'); return }
    setEditSaving(true); setEditError('')
    const { error } = await supabase.from('guests').update({
      name: editName, phone: editPhone || null,
      email: editEmail || null, party_size: editPartySize, notes: editNotes || null,
    }).eq('id', editGuest.id)
    if (error) { setEditError('Error: ' + error.message); setEditSaving(false); return }
    setGuests(prev => prev.map(g => g.id === editGuest.id ? {
      ...g, name: editName, phone: editPhone || null,
      email: editEmail || null, party_size: editPartySize, notes: editNotes || null,
    } : g))
    setEditGuest(null); setEditSaving(false)
  }

  const toggleSelect = (guestId: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(guestId) ? n.delete(guestId) : n.add(guestId)
      return n
    })
  }

  const toggleSelectAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(g => g.id)))
  }

  const bulkUpdateStatus = async (status: 'pending' | 'confirmed' | 'declined') => {
    const ids = Array.from(selected)
    await supabase.from('guests').update({ rsvp_status: status }).in('id', ids)
    setGuests(prev => prev.map(g => selected.has(g.id) ? { ...g, rsvp_status: status } : g))
    setSelected(new Set()); setShowBulkMenu(false)
  }

  const bulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} invitados?`)) return
    const ids = Array.from(selected)
    await supabase.from('guests').delete().in('id', ids)
    for (let i = 0; i < ids.length; i++)
      await supabase.rpc('decrement_guests', { event_id_input: id })
    setGuests(prev => prev.filter(g => !selected.has(g.id)))
    setEvent(prev => prev ? { ...prev, total_guests: Math.max(0, prev.total_guests - ids.length) } : prev)
    setSelected(new Set()); setShowBulkMenu(false)
  }

  const buildWaText = (guest: Guest, templateIndex = 0) => encodeURIComponent(
    (event?.message_templates?.[templateIndex] || 'Hola {nombre}, te escribimos de parte de {evento}.')
      .replace('{nombre}', guest.name)
      .replace('{evento}', event?.name || '')
      .replace('{fecha}', event?.event_date ? new Date(event.event_date).toLocaleDateString('es-MX') : '')
      .replace('{hora}', event?.event_time || '')
      .replace('{venue}', event?.venue || '')
  )

  const bulkWhatsApp = () => {
    const list = guests.filter(g => selected.has(g.id) && g.phone)
    if (!list.length) { alert('Ningún invitado seleccionado tiene WhatsApp'); return }
    list.forEach((g, i) => setTimeout(() =>
      window.open(`https://wa.me/${g.phone!.replace(/\D/g, '')}?text=${buildWaText(g)}`, '_blank'),
      i * 500))
    setShowBulkMenu(false)
  }

  const resetForm = () => { setName(''); setPhone(''); setEmail(''); setPartySize(1); setNotes(''); setFormError('') }

  const handleAddGuest = async () => {
    if (!name) { setFormError('El nombre es obligatorio'); return }
    setSaving(true); setFormError('')
    const { error } = await supabase.from('guests').insert({
      event_id: id, name, phone: phone || null, email: email || null,
      party_size: partySize, notes: notes || null, rsvp_status: 'pending',
    })
    if (error) { setFormError('Error: ' + error.message); setSaving(false); return }
    await supabase.rpc('increment_guests', { event_id_input: id })
    setEvent(prev => prev ? { ...prev, total_guests: prev.total_guests + 1 } : prev)
    await loadGuests(); resetForm(); setShowModal(false); setSaving(false)
  }

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setCsvError(''); setCsvSuccess('')
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) { setCsvError('El archivo está vacío'); return }
    const sep = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))
    const nameIdx  = headers.findIndex(h => h.includes('nombre') || h.includes('name'))
    const phoneIdx = headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('whatsapp') || h.includes('celular'))
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('correo'))
    if (nameIdx === -1) { setCsvError('No se encontró columna "nombre"'); return }
    const rows = lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/"/g, ''))
      return { event_id: id, name: cols[nameIdx] || '', phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null, email: emailIdx >= 0 ? cols[emailIdx] || null : null, party_size: 1, rsvp_status: 'pending' }
    }).filter(r => r.name)
    if (!rows.length) { setCsvError('No se encontraron invitados válidos'); return }
    const { error } = await supabase.from('guests').insert(rows)
    if (error) { setCsvError('Error al importar: ' + error.message); return }
    for (let i = 0; i < rows.length; i++) await supabase.rpc('increment_guests', { event_id_input: id })
    setEvent(prev => prev ? { ...prev, total_guests: prev.total_guests + rows.length } : prev)
    await loadGuests()
    setCsvSuccess(`✓ ${rows.length} invitados importados correctamente`)
    if (fileRef.current) fileRef.current.value = ''
  }

  const downloadTemplate = () => {
    const csv = `nombre,telefono,email\nMaria Jose,+52 81 1234 5678,mj@ejemplo.com\nPatrocleo Juarez,+52 55 9876 5432,\nAndres Garza,,andres@ejemplo.com`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_guestflow.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length
  const pending   = guests.filter(g => g.rsvp_status === 'pending').length
  const declined  = guests.filter(g => g.rsvp_status === 'declined').length
  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const activeTemplates = event?.message_templates?.filter(t => t.trim()) || []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', color: '#1D1E20' }}>

      {/* ── STICKY TOP PANEL ── */}
      <div style={{ flexShrink: 0, padding: '24px 40px 0', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0', color: '#1D1E20' }}>{event?.name}</h1>
            {event?.event_type && <div style={{ fontSize: '13px', color: '#888' }}>{EVENT_TYPE_LABELS[event.event_type]}</div>}
          </div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            {event?.event_date ? formatDate(event.event_date) : ''}
            {event?.venue ? ` · ${event.venue}` : ''}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total',       value: event?.total_guests || 0, color: '#1D1E20' },
            { label: 'Confirmados', value: confirmed, color: '#2a7a50' },
            { label: 'Pendientes',  value: pending,   color: '#b8860b' },
            { label: 'Declinaron',  value: declined,  color: '#cc3333' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f8f8f8', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
            style={{ width: '200px', padding: '8px 14px', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#1D1E20', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all',       label: `Todos (${guests.length})` },
              { key: 'confirmed', label: `Confirmados (${confirmed})` },
              { key: 'pending',   label: `Pendientes (${pending})` },
              { key: 'declined',  label: `Declinaron (${declined})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key as typeof filter)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                  background: filter === tab.key ? '#48C9B0' : 'transparent',
                  border: `1px solid ${filter === tab.key ? '#48C9B0' : '#e0e0e0'}`,
                  color: filter === tab.key ? '#fff' : '#666',
                  fontWeight: filter === tab.key ? '600' : '400',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {someSelected && (
              <div style={{ position: 'relative' }} ref={bulkMenuRef}>
                <button onClick={() => setShowBulkMenu(!showBulkMenu)}
                  style={{ padding: '8px 14px', background: '#f0fdfb', border: '1px solid #48C9B0', borderRadius: '8px', color: '#1a9e88', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  {selected.size} seleccionados ▾
                </button>
                {showBulkMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '4px', zIndex: 50, minWidth: '210px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <button onClick={bulkWhatsApp} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#25D366', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Enviar WhatsApp
                    </button>
                    <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />
                    <button onClick={() => bulkUpdateStatus('confirmed')} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#2a7a50', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px' }}>✓ Marcar confirmados</button>
                    <button onClick={() => bulkUpdateStatus('declined')} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#cc3333', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px' }}>✕ Marcar declinados</button>
                    <button onClick={() => bulkUpdateStatus('pending')} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#b8860b', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px' }}>◷ Marcar pendientes</button>
                    <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />
                    <button onClick={bulkDelete} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#cc3333', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px' }}>🗑 Eliminar seleccionados</button>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setCsvError(''); setCsvSuccess(''); setShowCsvModal(true) }}
              style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#666', fontSize: '13px', cursor: 'pointer' }}>
              📂 Importar CSV
            </button>
            <button onClick={() => { resetForm(); setShowModal(true) }}
              style={{ padding: '8px 16px', background: '#48C9B0', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              + Agregar invitado
            </button>
          </div>
        </div>
      </div>

      {/* ── GUEST LIST ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 40px 40px' }}>
        {loading ? (
          <div style={{ color: '#999', fontSize: '14px', paddingTop: '20px' }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #e0e0e0', borderRadius: '12px', marginTop: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '15px', color: '#888', marginBottom: '6px' }}>{guests.length === 0 ? 'Aún no hay invitados' : 'Sin resultados'}</div>
            <div style={{ fontSize: '13px', color: '#bbb' }}>{guests.length === 0 ? 'Agrega tu primer invitado o importa un CSV' : 'Intenta con otro filtro'}</div>
          </div>
        ) : (
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.5fr 1.5fr 1.5fr 140px 40px', padding: '8px 16px', background: '#f8f8f8', borderBottom: '1px solid #e8e8e8', alignItems: 'center' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: '#48C9B0' }} />
              {['Nombre', 'Notas', 'Email', 'Teléfono', 'Status', ''].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>

            {filtered.map((guest, i) => (
              <div key={guest.id}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 2fr 1.5fr 1.5fr 1.5fr 140px 40px',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none',
                  background: selected.has(guest.id) ? '#f0fdfb' : i % 2 === 0 ? '#fff' : '#fafafa',
                }}
                onMouseEnter={e => { if (!selected.has(guest.id)) e.currentTarget.style.background = '#f5f5f5' }}
                onMouseLeave={e => { if (!selected.has(guest.id)) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <input type="checkbox" checked={selected.has(guest.id)} onChange={() => toggleSelect(guest.id)} style={{ cursor: 'pointer', accentColor: '#48C9B0' }} />

                <div onClick={() => openEdit(guest)}
                  style={{ fontSize: '14px', fontWeight: '600', color: '#1D1E20', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {guest.name}
                  {guest.party_size > 1 && <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '400' }}>+{guest.party_size - 1}</span>}
                  <span style={{ fontSize: '11px', color: '#ccc' }}>✏️</span>
                </div>

                <div style={{ fontSize: '12px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={guest.notes || ''}>
                  {guest.notes || <span style={{ color: '#ddd' }}>—</span>}
                </div>

                <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guest.email || <span style={{ color: '#ddd' }}>—</span>}
                </div>

                {/* Teléfono + WhatsApp con dropdown de plantillas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {guest.phone ? (
                    <>
                      <span style={{ fontSize: '12px', color: '#888' }}>{guest.phone}</span>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowWaMenu(showWaMenu === guest.id ? null : guest.id)}
                          style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                          title="Enviar WhatsApp"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </button>
                        {showWaMenu === guest.id && (
                          <div ref={waMenuRef} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '4px', zIndex: 50, minWidth: '220px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                            {activeTemplates.length === 0 ? (
                              <div style={{ padding: '10px 12px', fontSize: '12px', color: '#aaa' }}>
                                No hay plantillas — ve a Configuración
                              </div>
                            ) : activeTemplates.map((template, ti) => (
                              <button key={ti}
                                onClick={() => {
                                  window.open(`https://wa.me/${guest.phone!.replace(/\D/g, '')}?text=${buildWaText(guest, ti)}`, '_blank')
                                  setShowWaMenu(null)
                                }}
                                style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#1D1E20', fontSize: '12px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', lineHeight: '1.4' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0fdfb'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '2px', fontWeight: '600' }}>PLANTILLA {ti + 1}</span>
                                {template.length > 60 ? template.substring(0, 60) + '...' : template}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#ddd' }}>—</span>
                  )}
                </div>

                <select value={guest.rsvp_status} onChange={e => updateStatus(guest.id, e.target.value as 'pending' | 'confirmed' | 'declined')}
                  style={{ padding: '4px 8px', background: STATUS_LABEL[guest.rsvp_status].bg, border: `1px solid ${STATUS_LABEL[guest.rsvp_status].border}`, borderRadius: '6px', color: STATUS_LABEL[guest.rsvp_status].color, fontSize: '11px', fontWeight: '600', cursor: 'pointer', outline: 'none', width: '120px' }}>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="declined">Declinó</option>
                </select>

                <button onClick={() => deleteGuest(guest.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL EDITAR ── */}
      {editGuest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#1D1E20' }}>Editar invitado</h2>
              <button onClick={() => setEditGuest(null)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Nombre *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>WhatsApp</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+52 81 1234 5678" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Notas</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Mesa preferida, restricciones alimentarias..." rows={2}
                  style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
            {editError && <div style={{ marginTop: '12px', padding: '10px', background: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', color: '#cc3333', fontSize: '13px' }}>{editError}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setEditGuest(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#888', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ flex: 2, padding: '12px', background: editSaving ? '#a0e0d8' : '#48C9B0', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#1D1E20' }}>Agregar invitado</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Nombre *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ana García" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>WhatsApp <span style={{ color: '#ccc', fontWeight: '400' }}>(opcional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 81 1234 5678" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Email <span style={{ color: '#ccc', fontWeight: '400' }}>(opcional)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', fontWeight: '500', marginBottom: '6px' }}>Notas <span style={{ color: '#ccc', fontWeight: '400' }}>(opcional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mesa preferida, restricciones alimentarias..." rows={2}
                  style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
            {formError && <div style={{ marginTop: '12px', padding: '10px', background: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', color: '#cc3333', fontSize: '13px' }}>{formError}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#888', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddGuest} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#a0e0d8' : '#48C9B0', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando...' : 'Agregar invitado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CSV ── */}
      {showCsvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#1D1E20' }}>Importar invitados</h2>
              <button onClick={() => setShowCsvModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '24px', height: '24px', background: '#48C9B0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>1</div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#1D1E20' }}>Descarga la plantilla</span>
              </div>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 34px', lineHeight: '1.5' }}>Descarga el archivo, llénalo en Excel o Google Sheets y guárdalo como CSV.</p>
              <div style={{ marginLeft: '34px', background: '#f8f8f8', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace', lineHeight: '1.8' }}>
                  <span style={{ color: '#b8860b', fontWeight: '600' }}>nombre</span> — obligatorio<br/>
                  <span style={{ color: '#48C9B0', fontWeight: '600' }}>telefono</span> — WhatsApp (opcional)<br/>
                  <span style={{ color: '#48C9B0', fontWeight: '600' }}>email</span> — correo (opcional)
                </div>
              </div>
              <button onClick={downloadTemplate} style={{ marginLeft: '34px', padding: '8px 16px', background: 'transparent', border: '1px solid #48C9B0', borderRadius: '8px', color: '#1a9e88', fontSize: '13px', cursor: 'pointer' }}>
                ⬇️ Descargar plantilla CSV
              </button>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: '24px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '24px', height: '24px', background: '#48C9B0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>2</div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#1D1E20' }}>Sube tu archivo</span>
              </div>
              {csvError && <div style={{ marginLeft: '34px', marginBottom: '12px', padding: '10px', background: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', color: '#cc3333', fontSize: '13px' }}>{csvError}</div>}
              {csvSuccess && <div style={{ marginLeft: '34px', marginBottom: '12px', padding: '10px', background: '#f0fff6', border: '1px solid #a0e0c0', borderRadius: '8px', color: '#2a7a50', fontSize: '13px' }}>{csvSuccess}</div>}
              <label style={{ marginLeft: '34px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#48C9B0', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                📁 Seleccionar archivo CSV
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCSV} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button onClick={() => setShowCsvModal(false)} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}