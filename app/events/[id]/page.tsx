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

const WA_ICON = (
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
)

const TRASH_ICON = (
  <>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </>
)

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
  const [mobileSelectMode, setMobileSelectMode] = useState(false)
  const bulkMenuRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleLongPressStart = (guestId: string) => {
    longPressTimer.current = setTimeout(() => {
      setMobileSelectMode(true)
      setSelected(new Set([guestId]))
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const exitMobileSelect = () => {
    setMobileSelectMode(false)
    setSelected(new Set())
  }

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
    if (mobileSelectMode) return
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
    setSelected(new Set()); setShowBulkMenu(false); setMobileSelectMode(false)
  }

  const bulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} invitados?`)) return
    const ids = Array.from(selected)
    await supabase.from('guests').delete().in('id', ids)
    for (let i = 0; i < ids.length; i++)
      await supabase.rpc('decrement_guests', { event_id_input: id })
    setGuests(prev => prev.filter(g => !selected.has(g.id)))
    setEvent(prev => prev ? { ...prev, total_guests: Math.max(0, prev.total_guests - ids.length) } : prev)
    setSelected(new Set()); setShowBulkMenu(false); setMobileSelectMode(false)
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

  const confirmed   = guests.filter(g => g.rsvp_status === 'confirmed').length
  const pending     = guests.filter(g => g.rsvp_status === 'pending').length
  const declined    = guests.filter(g => g.rsvp_status === 'declined').length
  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0
  const formatDate = (d: string) => {
  const [year, month, day] = d.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}
  const activeTemplates = event?.message_templates?.filter(t => t.trim()) || []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', color: '#1D1E20' }}>

      {/* ══ STICKY TOP PANEL ══ */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #e8e8e8' }} className="px-4 pt-4 pb-0 sm:px-6 sm:pt-5 lg:px-10 lg:pt-6">

      {/* Evento info */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl lg:text-2xl">{event?.name}</h1>
            {event?.event_type && (
              <span className="text-xs text-[#888] sm:text-sm">{EVENT_TYPE_LABELS[event.event_type]}</span>
            )}
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="shrink-0 text-xs text-[#999] transition hover:text-[#48C9B0] sm:hidden"
          >
            ← Eventos
          </button>
        </div>
        <p className="mt-0.5 text-xs text-[#888] sm:text-sm">
          {event?.event_date ? formatDate(event.event_date) : ''}
          {event?.venue ? ` · ${event.venue}` : ''}
        </p>
      </div>

        {/* Stats — 1 fila siempre */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: event?.total_guests || 0, color: '#1D1E20' },
            { label: 'Conf.', value: confirmed, color: '#2a7a50' },
            { label: 'Pend.', value: pending,   color: '#b8860b' },
            { label: 'Decl.', value: declined,  color: '#cc3333' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#e8e8e8] bg-[#f8f8f8] p-2 text-center">
              <div className="text-lg font-bold sm:text-xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[#999]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Buscador + filtros + acciones */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">

          {/* Buscador — 100% ancho */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar..."
            className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2 text-sm text-[#1D1E20] outline-none sm:w-48"
          />

          {/* Filtros + botón en la misma fila */}
          <div className="flex items-center gap-1.5">
            <div className="flex flex-1 gap-1.5">
              {[
                { key: 'all',       label: 'Todos' },
                { key: 'confirmed', label: 'Conf.' },
                { key: 'pending',   label: 'Pend.' },
                { key: 'declined',  label: 'Dec.' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as typeof filter)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs transition
                    ${filter === tab.key
                      ? 'border-[#48C9B0] bg-[#48C9B0] font-semibold text-white'
                      : 'border-[#e0e0e0] text-[#666] hover:border-[#48C9B0] hover:text-[#48C9B0]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex shrink-0 items-center gap-2">
              {someSelected && (
                <div className="relative" ref={bulkMenuRef}>
                  <button
                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                    className="rounded-lg border border-[#48C9B0] bg-[#f0fdfb] px-3 py-1.5 text-xs font-semibold text-[#1a9e88]"
                  >
                    {selected.size} selec. ▾
                  </button>
                  {showBulkMenu && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-[#e8e8e8] bg-white p-1 shadow-lg">
                      <button onClick={bulkWhatsApp} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#25D366] hover:bg-[#f0fdfb]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366">{WA_ICON}</svg>
                        Enviar WhatsApp
                      </button>
                      <div className="my-1 h-px bg-[#f0f0f0]" />
                      <button onClick={() => bulkUpdateStatus('confirmed')} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#2a7a50] hover:bg-[#f0fff6]">✓ Marcar confirmados</button>
                      <button onClick={() => bulkUpdateStatus('declined')}  className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#cc3333] hover:bg-[#fff0f0]">✕ Marcar declinados</button>
                      <button onClick={() => bulkUpdateStatus('pending')}   className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#b8860b] hover:bg-[#fffbf0]">◷ Marcar pendientes</button>
                      <div className="my-1 h-px bg-[#f0f0f0]" />
                      <button onClick={bulkDelete} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#cc3333] hover:bg-[#fff0f0]">🗑 Eliminar seleccionados</button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => { setCsvError(''); setCsvSuccess(''); setShowCsvModal(true) }}
                className="hidden rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#666] transition hover:border-[#48C9B0] hover:text-[#48C9B0] sm:block"
              >
                📂 Importar CSV
              </button>
              <button
                onClick={() => { resetForm(); setShowModal(true) }}
                className="rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3ab89f] sm:px-4 sm:text-sm"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ GUEST LIST ══ */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="px-4 pb-6 pt-3 sm:px-6 lg:px-10">
        {loading ? (
          <p className="pt-5 text-sm text-[#999]">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#e0e0e0] px-6 py-14 text-center">
            <div className="mb-3 text-3xl">👥</div>
            <p className="text-sm text-[#888]">{guests.length === 0 ? 'Aún no hay invitados' : 'Sin resultados'}</p>
            <p className="mt-1 text-xs text-[#bbb]">{guests.length === 0 ? 'Agrega tu primer invitado o importa un CSV' : 'Intenta con otro filtro'}</p>
          </div>
        ) : (
          <>
            {/* ── MOBILE: cards ── */}
            <div className="flex flex-col gap-2 sm:hidden">

              {/* Banner modo selección */}
              {mobileSelectMode && (
                <div className="flex items-center justify-between rounded-xl border border-[#48C9B0] bg-[#f0fdfb] px-4 py-2.5">
                  <span className="text-xs font-semibold text-[#1a9e88]">
                    {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => bulkUpdateStatus('confirmed')} className="rounded-lg bg-[#f0fff6] px-2.5 py-1 text-xs font-semibold text-[#2a7a50]">✓ Conf.</button>
                    <button onClick={() => bulkUpdateStatus('pending')}   className="rounded-lg bg-[#fffbf0] px-2.5 py-1 text-xs font-semibold text-[#b8860b]">◷ Pend.</button>
                    <button onClick={() => bulkUpdateStatus('declined')}  className="rounded-lg bg-[#fff0f0] px-2.5 py-1 text-xs font-semibold text-[#cc3333]">✕ Dec.</button>
                    <button onClick={bulkDelete} className="rounded-lg bg-[#fff0f0] px-2.5 py-1 text-xs font-semibold text-[#cc3333]">🗑</button>
                    <button onClick={exitMobileSelect} className="ml-1 text-xs text-[#aaa]">Cancelar</button>
                  </div>
                </div>
              )}

              {filtered.map(guest => (
                <div
                  key={guest.id}
                  className={`rounded-xl border bg-white px-3 py-3 transition
                    ${mobileSelectMode && selected.has(guest.id)
                      ? 'border-[#48C9B0] bg-[#f0fdfb]'
                      : 'border-[#e8e8e8]'
                    }`}
                  onTouchStart={() => handleLongPressStart(guest.id)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                >
                  <div className="flex items-center gap-2">

                    {/* Checkbox — solo en modo selección */}
                    {mobileSelectMode && (
                      <input
                        type="checkbox"
                        checked={selected.has(guest.id)}
                        onChange={() => toggleSelect(guest.id)}
                        className="h-4 w-4 shrink-0 accent-[#48C9B0]"
                      />
                    )}

                    {/* WhatsApp — extremo izquierdo */}
                    {!mobileSelectMode && (
                      <div className="shrink-0">
                        {guest.phone ? (
                          <button
                            onClick={() => window.open(`https://wa.me/${guest.phone!.replace(/\D/g, '')}?text=${buildWaText(guest)}`, '_blank')}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c0f0dc] bg-[#f0fff8]"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">{WA_ICON}</svg>
                          </button>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f0f0f0] bg-[#fafafa]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ddd">{WA_ICON}</svg>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nombre + teléfono */}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => openEdit(guest)}
                        className="block w-full truncate text-left text-sm font-semibold text-[#1D1E20]"
                      >
                        {guest.name}
                        {guest.party_size > 1 && (
                          <span className="ml-1 text-xs font-normal text-[#aaa]">+{guest.party_size - 1}</span>
                        )}
                      </button>
                      <p className="mt-0.5 truncate text-xs text-[#aaa]">
                        {guest.phone || 'Sin teléfono'}
                      </p>
                    </div>

                    {/* Status dropdown — siempre visible, deshabilitado en modo selección */}
                    <div className="shrink-0">
                      <select
                        value={guest.rsvp_status}
                        onChange={e => !mobileSelectMode && updateStatus(guest.id, e.target.value as 'pending' | 'confirmed' | 'declined')}
                        disabled={mobileSelectMode}
                        className="rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none"
                        style={{
                          background: STATUS_LABEL[guest.rsvp_status].bg,
                          borderColor: STATUS_LABEL[guest.rsvp_status].border,
                          color: STATUS_LABEL[guest.rsvp_status].color,
                          cursor: mobileSelectMode ? 'default' : 'pointer',
                          opacity: mobileSelectMode ? 0.7 : 1,
                        }}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="declined">Declinó</option>
                      </select>
                    </div>

                    {/* Eliminar */}
                    {!mobileSelectMode && (
                      <button
                        onClick={() => deleteGuest(guest.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ffe0e0] bg-[#fff5f5]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {TRASH_ICON}
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── TABLET / DESKTOP: tabla ── */}
            <div className="hidden overflow-hidden rounded-xl border border-[#e8e8e8] sm:block">
              <div className="grid items-center border-b border-[#e8e8e8] bg-[#f8f8f8] px-4 py-2"
                style={{ gridTemplateColumns: '40px 2fr 1.5fr 1.5fr 1.5fr 140px 40px' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: '#48C9B0' }} />
                {['Nombre', 'Notas', 'Email', 'Teléfono', 'Status', ''].map(h => (
                  <div key={h} className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">{h}</div>
                ))}
              </div>
              {filtered.map((guest, i) => (
                <div
                  key={guest.id}
                  className={`grid items-center px-4 py-2.5 transition
                    ${selected.has(guest.id) ? 'bg-[#f0fdfb]' : i % 2 === 0 ? 'bg-white hover:bg-[#f5f5f5]' : 'bg-[#fafafa] hover:bg-[#f5f5f5]'}
                    ${i < filtered.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}
                  style={{ gridTemplateColumns: '40px 2fr 1.5fr 1.5fr 1.5fr 140px 40px' }}
                >
                  <input type="checkbox" checked={selected.has(guest.id)} onChange={() => toggleSelect(guest.id)} style={{ cursor: 'pointer', accentColor: '#48C9B0' }} />
                  <div onClick={() => openEdit(guest)} className="flex cursor-pointer items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#1D1E20]">{guest.name}</span>
                    {guest.party_size > 1 && <span className="text-xs text-[#aaa]">+{guest.party_size - 1}</span>}
                    <span className="text-xs text-[#ddd]">✏️</span>
                  </div>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#aaa]" title={guest.notes || ''}>
                    {guest.notes || <span className="text-[#ddd]">—</span>}
                  </div>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#888]">
                    {guest.email || <span className="text-[#ddd]">—</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {guest.phone ? (
                      <>
                        <span className="text-xs text-[#888]">{guest.phone}</span>
                        <div className="relative">
                          <button onClick={() => setShowWaMenu(showWaMenu === guest.id ? null : guest.id)} className="flex items-center p-0.5">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">{WA_ICON}</svg>
                          </button>
                          {showWaMenu === guest.id && (
                            <div ref={waMenuRef} className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-[#e8e8e8] bg-white p-1 shadow-lg">
                              {activeTemplates.length === 0 ? (
                                <p className="px-3 py-2.5 text-xs text-[#aaa]">No hay plantillas — ve a Configuración</p>
                              ) : activeTemplates.map((template, ti) => (
                                <button key={ti}
                                  onClick={() => { window.open(`https://wa.me/${guest.phone!.replace(/\D/g, '')}?text=${buildWaText(guest, ti)}`, '_blank'); setShowWaMenu(null) }}
                                  className="w-full rounded-lg px-3 py-2 text-left text-xs leading-snug text-[#1D1E20] hover:bg-[#f0fdfb]"
                                >
                                  <span className="mb-0.5 block text-[10px] font-semibold text-[#aaa]">PLANTILLA {ti + 1}</span>
                                  {template.length > 60 ? template.substring(0, 60) + '...' : template}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-[#ddd]">—</span>
                    )}
                  </div>
                  <select
                    value={guest.rsvp_status}
                    onChange={e => updateStatus(guest.id, e.target.value as 'pending' | 'confirmed' | 'declined')}
                    className="w-[120px] cursor-pointer rounded-md border px-2 py-1 text-xs font-semibold outline-none"
                    style={{
                      background: STATUS_LABEL[guest.rsvp_status].bg,
                      borderColor: STATUS_LABEL[guest.rsvp_status].border,
                      color: STATUS_LABEL[guest.rsvp_status].color,
                    }}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="declined">Declinó</option>
                  </select>
                  <button onClick={() => deleteGuest(guest.id)} className="flex items-center justify-center p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {TRASH_ICON}
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══ MODAL EDITAR ══ */}
      {editGuest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-y-auto rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl sm:p-8" style={{ maxHeight: '90vh' }}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Editar invitado</h2>
              <button onClick={() => setEditGuest(null)} className="text-xl text-[#aaa]">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">Nombre *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">WhatsApp</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+52 81 1234 5678" style={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">Notas</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Mesa preferida, restricciones..." rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
            {editError && <div className="mt-3 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] p-2.5 text-xs text-[#cc3333]">{editError}</div>}
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setEditGuest(null)} className="flex-1 rounded-lg border border-[#e0e0e0] py-3 text-sm text-[#888]">Cancelar</button>
              <button onClick={handleEditSave} disabled={editSaving} className="flex-[2] rounded-lg bg-[#48C9B0] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL AGREGAR ══ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-y-auto rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl sm:p-8" style={{ maxHeight: '90vh' }}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Agregar invitado</h2>
              <button onClick={() => setShowModal(false)} className="text-xl text-[#aaa]">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">Nombre *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ana García" style={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">WhatsApp <span className="font-normal text-[#ccc]">(opcional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 81 1234 5678" style={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">Email <span className="font-normal text-[#ccc]">(opcional)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555] sm:text-sm">Notas <span className="font-normal text-[#ccc]">(opcional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mesa preferida, restricciones..." rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
            {formError && <div className="mt-3 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] p-2.5 text-xs text-[#cc3333]">{formError}</div>}
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-[#e0e0e0] py-3 text-sm text-[#888]">Cancelar</button>
              <button onClick={handleAddGuest} disabled={saving} className="flex-[2] rounded-lg bg-[#48C9B0] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Guardando...' : 'Agregar invitado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CSV ══ */}
      {showCsvModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Importar invitados</h2>
              <button onClick={() => setShowCsvModal(false)} className="text-xl text-[#aaa]">✕</button>
            </div>
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#48C9B0] text-xs font-bold text-white">1</div>
                <span className="text-sm font-semibold text-[#1D1E20]">Descarga la plantilla</span>
              </div>
              <p className="mb-3 ml-8 text-xs leading-relaxed text-[#666]">Llénala en Excel o Google Sheets y guárdala como CSV.</p>
              <div className="mb-3 ml-8 rounded-lg border border-[#e8e8e8] bg-[#f8f8f8] p-3 font-mono text-xs leading-relaxed">
                <span className="font-semibold text-[#b8860b]">nombre</span> — obligatorio<br/>
                <span className="font-semibold text-[#48C9B0]">telefono</span> — WhatsApp (opcional)<br/>
                <span className="font-semibold text-[#48C9B0]">email</span> — correo (opcional)
              </div>
              <button onClick={downloadTemplate} className="ml-8 rounded-lg border border-[#48C9B0] px-4 py-2 text-xs text-[#1a9e88] transition hover:bg-[#f0fdfb]">
                ⬇️ Descargar plantilla CSV
              </button>
            </div>
            <div className="mb-6 border-t border-[#f0f0f0]" />
            <div>
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#48C9B0] text-xs font-bold text-white">2</div>
                <span className="text-sm font-semibold text-[#1D1E20]">Sube tu archivo</span>
              </div>
              {csvError   && <div className="mb-3 ml-8 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] p-2.5 text-xs text-[#cc3333]">{csvError}</div>}
              {csvSuccess && <div className="mb-3 ml-8 rounded-lg border border-[#a0e0c0] bg-[#f0fff6] p-2.5 text-xs text-[#2a7a50]">{csvSuccess}</div>}
              <label className="ml-8 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#48C9B0] px-4 py-2 text-xs font-semibold text-white">
                📁 Seleccionar archivo CSV
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCSV} className="hidden" />
              </label>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setShowCsvModal(false)} className="rounded-lg border border-[#e0e0e0] px-5 py-2 text-xs text-[#888]">Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}