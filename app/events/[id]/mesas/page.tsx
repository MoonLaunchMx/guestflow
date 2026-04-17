'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Guest } from '@/lib/types'
import { Plus, Trash2, Users, ChevronDown, ChevronUp, X, LayoutGrid, List, Map as MapIcon, Printer, Search } from 'lucide-react'

const STATUS_COLORS = {
  confirmed: { bg: '#f0fff6', border: '#a0e0c0', text: '#2a7a50', label: 'Confirmado' },
  pending:   { bg: '#fffbf0', border: '#f0d080', text: '#b8860b', label: 'Pendiente'  },
  declined:  { bg: '#fff0f0', border: '#ffc0c0', text: '#cc3333', label: 'Declinó'    },
}

const TAG_COLORS = [
  { bg: '#f0fdfb', border: '#9FE1CB', text: '#0F6E56' },
  { bg: '#f0f0ff', border: '#afa9ec', text: '#3C3489' },
  { bg: '#fff5f0', border: '#F0997B', text: '#993C1D' },
  { bg: '#f0f8ff', border: '#85B7EB', text: '#0C447C' },
  { bg: '#fffbf0', border: '#FAC775', text: '#854F0B' },
  { bg: '#fff0f7', border: '#ED93B1', text: '#72243E' },
  { bg: '#f3fde8', border: '#C0DD97', text: '#3B6D11' },
  { bg: '#fff5f0', border: '#f09595', text: '#A32D2D' },
]

const inp = 'w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5 text-sm text-[#1D1E20] outline-none focus:border-[#48C9B0]'
const inpStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#f8f8f8', border: '1px solid #e0e0e0',
  borderRadius: '8px', color: '#1D1E20',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

type EditMember = {
  id?: string
  name: string
  phone: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
}

function TagSelector({ availableTags, selectedTags, onChange }: {
  availableTags: string[]
  selectedTags: string[]
  onChange: (tags: string[]) => void
}) {
  if (availableTags.length === 0) return <p className="text-xs text-[#bbb]">Sin tags — agrégalos desde Configuración.</p>
  const toggle = (tag: string) => onChange(
    selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]
  )
  return (
    <div className="flex flex-wrap gap-1.5">
      {availableTags.map((tag, i) => {
        const col = TAG_COLORS[i % TAG_COLORS.length]
        const isSelected = selectedTags.includes(tag)
        return (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className="rounded-full border px-2.5 py-1 text-xs font-medium transition"
            style={isSelected
              ? { background: col.bg, borderColor: col.border, color: col.text }
              : { background: '#f8f8f8', borderColor: '#e0e0e0', color: '#aaa' }}>
            {tag}
          </button>
        )
      })}
    </div>
  )
}

function MembersEditor({ value, onChange }: { value: EditMember[]; onChange: (v: EditMember[]) => void }) {
  const MAX = 5
  const add = () => { if (value.length < MAX) onChange([...value, { name: '', phone: '', rsvp_status: 'pending' }]) }
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof EditMember, val: string) =>
    onChange(value.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-[#555]">Acompañantes <span className="font-normal text-[#ccc]">(máx. {MAX})</span></label>
        {value.length < MAX && <button type="button" onClick={add} className="text-xs font-semibold text-[#48C9B0] hover:underline">+ Agregar</button>}
      </div>
      {value.length === 0 && <p className="text-xs text-[#bbb]">Sin acompañantes.</p>}
      <div className="flex flex-col gap-2">
        {value.map((m, i) => (
          <div key={i} className="rounded-lg border border-[#e8e8e8] bg-[#f8f8f8] p-3">
            <div className="mb-2"><span className="text-[11px] font-semibold text-[#aaa]">+{i + 1}</span></div>
            <div className="flex flex-col gap-2">
              <input type="text" value={m.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Nombre (opcional)" style={{ ...inpStyle, fontSize: '13px', padding: '8px 12px' }} />
              <input type="tel" value={m.phone} onChange={e => update(i, 'phone', e.target.value)} placeholder="WhatsApp (opcional)" style={{ ...inpStyle, fontSize: '13px', padding: '8px 12px' }} />
              <select value={m.rsvp_status} onChange={e => update(i, 'rsvp_status', e.target.value)} style={{ ...inpStyle, fontSize: '13px', padding: '8px 12px', cursor: 'pointer' }}>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="declined">Declinó</option>
              </select>
              <button type="button" onClick={() => remove(i)} className="mt-1 w-full rounded-lg border border-[#ffe0e0] bg-[#fff5f5] py-1.5 text-xs font-semibold text-[#cc3333] transition hover:bg-[#ffe8e8]">
                Eliminar acompañante
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type PartyMemberInfo = {
  id: string
  name: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  checked_in: boolean
}

type GuestFull = Pick<Guest, 'id' | 'name' | 'rsvp_status'> & {
  tags: string[]
  party_size: number
  notes: string | null
  phone?: string | null
  email?: string | null
  checked_in: boolean
  party_members: PartyMemberInfo[]
}

type SeatRecord = {
  id: string
  table_id: string
  event_id: string
  seat_number: number
  guest_id: string | null
  party_size: number
  guest?: GuestFull | null
}

type TableRecord = {
  id: string
  event_id: string
  number: number
  name: string | null
  capacity: number
  shape: 'round' | 'rectangle'
  position_x: number
  position_y: number
  created_at: string
  seats: SeatRecord[]
}

type MoveModal = {
  guest: GuestFull
  fromSeatId: string
  fromTableNumber: number
  toTableId: string
  toTableCapacity: number
}

type EventInfo = { name: string; event_date: string | null; venue: string | null }

export default function MesasPage() {
  const { id: eventId } = useParams()

  const [tables, setTables]       = useState<TableRecord[]>([])
  const [guests, setGuests]       = useState<GuestFull[]>([])
  const [eventTags, setEventTags] = useState<string[]>([])
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null)
  const [loading, setLoading]     = useState(true)
  const [viewMode, setViewMode]   = useState<'cards' | 'list'>('cards')
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [listSearch, setListSearch] = useState('')

  // Modal mesa
  const [showModal, setShowModal]     = useState(false)
  const [editTable, setEditTable]     = useState<TableRecord | null>(null)
  const [modalNumber, setModalNumber] = useState('')
  const [modalName, setModalName]     = useState('')
  const [modalCap, setModalCap]       = useState('8')
  const [modalShape, setModalShape]   = useState<'round' | 'rectangle'>('round')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError]   = useState('')

  // Modal mover
  const [moveModal, setMoveModal]   = useState<MoveModal | null>(null)
  const [moveSaving, setMoveSaving] = useState(false)

  // Modal detalle mobile
  const [guestDetail, setGuestDetail] = useState<GuestFull | null>(null)

  // Modal editar invitado
  const [editGuest, setEditGuest]     = useState<GuestFull | null>(null)
  const [editName, setEditName]       = useState('')
  const [editPhone, setEditPhone]     = useState('')
  const [editEmail, setEditEmail]     = useState('')
  const [editNotes, setEditNotes]     = useState('')
  const [editTags, setEditTags]       = useState<string[]>([])
  const [editMembers, setEditMembers] = useState<EditMember[]>([])
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Assign modal
  const [assignModal, setAssignModal]   = useState<{ tableId: string; tableCapacity: number } | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const assignSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (assignModal) setTimeout(() => assignSearchRef.current?.focus(), 50)
  }, [assignModal])

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true)
    const [tablesRes, seatsRes, guestsRes, membersRes, eventRes] = await Promise.all([
      supabase.from('tables').select('*').eq('event_id', eventId).order('number'),
      supabase.from('table_seats').select('*').eq('event_id', eventId),
      supabase.from('guests').select('id, name, rsvp_status, tags, party_size, notes, phone, email, checked_in').eq('event_id', eventId).order('name'),
      supabase.from('party_members').select('id, guest_id, name, rsvp_status, checked_in').eq('event_id', eventId),
      supabase.from('events').select('guest_tags, name, event_date, venue').eq('id', eventId).single(),
    ])

    const guestsMap = new Map<string, GuestFull>()
    for (const g of (guestsRes.data || [])) {
      guestsMap.set(g.id, {
        ...g,
        tags: g.tags || [],
        notes: g.notes || null,
        phone: g.phone || null,
        email: g.email || null,
        checked_in: g.checked_in || false,
        party_members: (membersRes.data || [])
          .filter(m => m.guest_id === g.id)
          .map(m => ({ ...m, checked_in: m.checked_in || false })),
      })
    }

    const combined: TableRecord[] = (tablesRes.data || []).map(t => ({
      ...t,
      seats: (seatsRes.data || [])
        .filter(s => s.table_id === t.id)
        .map(s => ({ ...s, guest: s.guest_id ? guestsMap.get(s.guest_id) || null : null })),
    }))

    setTables(combined)
    setGuests(Array.from(guestsMap.values()))
    setEventTags(eventRes.data?.guest_tags || [])
    setEventInfo({
      name: eventRes.data?.name || '',
      event_date: eventRes.data?.event_date || null,
      venue: eventRes.data?.venue || null,
    })
    setLoading(false)
  }

  // ── Editar invitado ───────────────────────────────────────────────────────

  const openEditGuest = (guest: GuestFull) => {
    setEditGuest(guest)
    setEditName(guest.name)
    setEditPhone(guest.phone || '')
    setEditEmail(guest.email || '')
    setEditNotes(guest.notes || '')
    setEditTags(guest.tags || [])
    setEditError('')
    setEditMembers(guest.party_members.map(m => ({
      id: m.id,
      name: m.name,
      phone: '',
      rsvp_status: m.rsvp_status,
    })))
  }

  const handleEditSave = async () => {
    if (!editGuest) return
    if (!editName) { setEditError('El nombre es obligatorio'); return }
    if (editPhone) {
      const norm = normalizePhone(editPhone)
      if (norm.length > 0) {
        const dup = guests.find(g => g.id !== editGuest.id && g.phone && normalizePhone(g.phone) === norm)
        if (dup) { setEditError(`Este WhatsApp ya está registrado para "${dup.name}"`); return }
      }
    }
    setEditSaving(true); setEditError('')
    const { error } = await supabase.from('guests').update({
      name: editName,
      phone: editPhone || null,
      email: editEmail || null,
      party_size: 1 + editMembers.length,
      notes: editNotes || null,
      tags: editTags,
    }).eq('id', editGuest.id)
    if (error) { setEditError('Error: ' + error.message); setEditSaving(false); return }

    const existingIds = editGuest.party_members.map(m => m.id)
    const keepIds = editMembers.filter(m => m.id).map(m => m.id as string)
    const toDelete = existingIds.filter(id => !keepIds.includes(id))
    if (toDelete.length > 0) await supabase.from('party_members').delete().in('id', toDelete)
    for (const m of editMembers.filter(m => m.id)) {
      await supabase.from('party_members').update({
        name: m.name, phone: m.phone || null, rsvp_status: m.rsvp_status,
      }).eq('id', m.id!)
    }
    const toInsert = editMembers.filter(m => !m.id)
    if (toInsert.length > 0) {
      await supabase.from('party_members').insert(toInsert.map(m => ({
        guest_id: editGuest.id,
        event_id: eventId as string,
        name: m.name,
        phone: m.phone || null,
        rsvp_status: m.rsvp_status,
      })))
    }
    await loadData()
    setEditGuest(null)
    setEditSaving(false)
  }

  // ── Check-in ──────────────────────────────────────────────────────────────

  const toggleCheckin = async (guestId: string, current: boolean) => {
    await supabase.from('guests').update({ checked_in: !current }).eq('id', guestId)
    setTables(prev => prev.map(t => ({
      ...t,
      seats: t.seats.map(s => {
        if (s.guest?.id !== guestId) return s
        return { ...s, guest: { ...s.guest!, checked_in: !current } }
      })
    })))
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, checked_in: !current } : g))
  }

  const toggleMemberCheckin = async (memberId: string, guestId: string, current: boolean) => {
    await supabase.from('party_members').update({ checked_in: !current }).eq('id', memberId)
    setTables(prev => prev.map(t => ({
      ...t,
      seats: t.seats.map(s => {
        if (s.guest?.id !== guestId) return s
        return {
          ...s,
          guest: {
            ...s.guest!,
            party_members: s.guest!.party_members.map(m =>
              m.id === memberId ? { ...m, checked_in: !current } : m
            )
          }
        }
      })
    })))
    setGuests(prev => prev.map(g =>
      g.id === guestId
        ? { ...g, party_members: g.party_members.map(m => m.id === memberId ? { ...m, checked_in: !current } : m) }
        : g
    ))
  }

  // ── Imprimir ──────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const formatDate = (d: string) => {
      const [year, month, day] = d.split('T')[0].split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    const rows: string[] = []
    let rowNum = 1
    for (const table of tables) {
      for (const seat of table.seats) {
        const g = seat.guest
        if (!g) continue
        const tagsText = g.tags.join(', ') || '—'
        const notesText = g.notes || '—'
        rows.push(`
          <tr class="main-row">
            <td>${rowNum++}</td>
            <td>${table.number}${table.name ? ' · ' + table.name : ''}</td>
            <td class="name-cell">${g.name}</td>
            <td>${STATUS_COLORS[g.rsvp_status].label}</td>
            <td class="tags-cell">${tagsText}</td>
            <td class="notes-cell">${notesText}</td>
            <td class="checkbox-cell"><div class="print-checkbox"></div></td>
          </tr>
        `)
        for (const m of g.party_members) {
          rows.push(`
            <tr class="member-row">
              <td>${rowNum++}</td>
              <td></td>
              <td class="name-cell member-name">↳ ${m.name || 'Acompañante'}</td>
              <td>${STATUS_COLORS[m.rsvp_status].label}</td>
              <td>—</td><td>—</td>
              <td class="checkbox-cell"><div class="print-checkbox"></div></td>
            </tr>
          `)
        }
      }
    }
    const totalPersonas = tables.reduce((acc, t) =>
      acc + t.seats.reduce((a, s) => a + (s.guest ? 1 + s.guest.party_members.length : 0), 0), 0)
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista — ${eventInfo?.name || 'Evento'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1D1E20; padding: 20px; }
        .header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #1D1E20; }
        .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .header-meta { display: flex; gap: 20px; margin-top: 6px; font-size: 10px; color: #888; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        col.col-num { width: 24px; } col.col-mesa { width: 80px; } col.col-name { width: 22%; }
        col.col-rsvp { width: 72px; } col.col-tags { width: 18%; } col.col-notes { width: auto; } col.col-check { width: 44px; }
        thead th { text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 5px 6px; border-bottom: 1.5px solid #1D1E20; }
        .main-row td { padding: 7px 6px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
        .member-row td { padding: 4px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; color: #666; }
        .name-cell { font-weight: 600; } .member-name { font-weight: 400; padding-left: 14px !important; }
        .tags-cell { font-size: 10px; color: #555; } .notes-cell { font-size: 10px; color: #777; }
        .checkbox-cell { text-align: center; }
        .print-checkbox { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #1D1E20; border-radius: 3px; margin-top: 1px; }
        .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e8e8e8; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }
        @media print { body { padding: 0; } @page { margin: 1.2cm; size: A4 landscape; } tr { page-break-inside: avoid; } }
      </style></head><body>
      <div class="header">
        <h1>${eventInfo?.name || 'Lista de invitados'}</h1>
        <div class="header-meta">
          ${eventInfo?.event_date ? `<span>📅 ${formatDate(eventInfo.event_date)}</span>` : ''}
          ${eventInfo?.venue ? `<span>📍 ${eventInfo.venue}</span>` : ''}
          <span>👥 ${totalPersonas} personas · ${tables.length} mesas</span>
        </div>
      </div>
      <table>
        <colgroup><col class="col-num"><col class="col-mesa"><col class="col-name"><col class="col-rsvp"><col class="col-tags"><col class="col-notes"><col class="col-check"></colgroup>
        <thead><tr><th>#</th><th>Mesa</th><th>Nombre</th><th>RSVP</th><th>Tags</th><th>Notas</th><th style="text-align:center">Llegó</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      <div class="footer">
        <span>GuestFlow — Lista de asistencia</span>
        <span>Impreso el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div></body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html); win.document.close()
    win.onload = () => { win.print() }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getOccupied = (table: TableRecord) =>
    table.seats.filter(s => s.guest_id).reduce((acc, s) => acc + (s.party_size || 1), 0)

  const guestSeatMap = new Map<string, { seatId: string; tableNumber: number; tableId: string; tableCapacity: number }>()
  for (const t of tables) {
    for (const s of t.seats) {
      if (s.guest_id) guestSeatMap.set(s.guest_id, { seatId: s.id, tableNumber: t.number, tableId: t.id, tableCapacity: t.capacity })
    }
  }

  const assignFilteredGuests = assignSearch
    ? guests.filter(g => g.name.toLowerCase().includes(assignSearch.toLowerCase()))
    : guests

  // ── Mesas CRUD ────────────────────────────────────────────────────────────

  const openCreate = () => {
    const next = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1
    setEditTable(null); setModalNumber(String(next)); setModalName('')
    setModalCap('8'); setModalShape('round'); setModalError(''); setShowModal(true)
  }

  const openEditTable = (table: TableRecord) => {
    setEditTable(table); setModalNumber(String(table.number)); setModalName(table.name || '')
    setModalCap(String(table.capacity)); setModalShape(table.shape); setModalError(''); setShowModal(true)
  }

  const handleSaveTable = async () => {
    if (!modalNumber) { setModalError('El número es obligatorio'); return }
    const cap = parseInt(modalCap)
    if (!cap || cap < 1 || cap > 100) { setModalError('Capacidad entre 1 y 100'); return }
    setModalSaving(true); setModalError('')
    if (editTable) {
      const { error } = await supabase.from('tables')
        .update({ number: parseInt(modalNumber), name: modalName || null, capacity: cap, shape: modalShape })
        .eq('id', editTable.id)
      if (error) { setModalError(error.message); setModalSaving(false); return }
    } else {
      const { error } = await supabase.from('tables')
        .insert({ event_id: eventId, number: parseInt(modalNumber), name: modalName || null, capacity: cap, shape: modalShape })
      if (error) { setModalError(error.message); setModalSaving(false); return }
    }
    await loadData(); setShowModal(false); setModalSaving(false)
  }

  const handleDeleteTable = async (table: TableRecord) => {
    if (!confirm(`¿Eliminar Mesa ${table.number}${table.name ? ' — ' + table.name : ''}?`)) return
    await supabase.from('tables').delete().eq('id', table.id)
    setTables(prev => prev.filter(t => t.id !== table.id))
  }

  // ── Asignar ───────────────────────────────────────────────────────────────

  const handleSelectGuest = (guestId: string, tableId: string, tableCapacity: number) => {
    const guest    = guests.find(g => g.id === guestId)!
    const existing = guestSeatMap.get(guestId)
    if (existing && existing.tableId !== tableId) {
      setMoveModal({ guest, fromSeatId: existing.seatId, fromTableNumber: existing.tableNumber, toTableId: tableId, toTableCapacity: tableCapacity })
      setAssignModal(null); setAssignSearch(''); return
    }
    doAssignGuest(tableId, tableCapacity, guest)
  }

  const doAssignGuest = async (tableId: string, tableCapacity: number, guest: GuestFull) => {
    const table     = tables.find(t => t.id === tableId)!
    const occupied  = getOccupied(table)
    const needed    = guest.party_size || 1
    const available = tableCapacity - occupied
    if (needed > available) {
      alert(`No hay espacio suficiente.\n\n"${guest.name}"${guest.party_size > 1 ? ` viene con ${guest.party_size - 1} acompañante(s)` : ''} y necesita ${needed} asiento(s).\nEsta mesa solo tiene ${available} disponible(s).`)
      return
    }
    const nextSeat = (table.seats.map(s => s.seat_number).sort((a, b) => b - a)[0] || 0) + 1
    await supabase.from('table_seats').insert({
      table_id: tableId, event_id: eventId,
      seat_number: nextSeat, guest_id: guest.id, party_size: needed,
    })
    await loadData(); setAssignModal(null); setAssignSearch('')
  }

  const handleConfirmMove = async () => {
    if (!moveModal) return
    setMoveSaving(true)
    const { guest, fromSeatId, toTableId, toTableCapacity } = moveModal
    const toTable   = tables.find(t => t.id === toTableId)!
    const occupied  = getOccupied(toTable)
    const needed    = guest.party_size || 1
    const available = toTableCapacity - occupied
    if (needed > available) {
      alert(`No hay espacio en Mesa ${toTable.number}.\nNecesita ${needed} asiento(s) pero solo hay ${available}.`)
      setMoveSaving(false); setMoveModal(null); return
    }
    await supabase.from('table_seats').delete().eq('id', fromSeatId)
    const nextSeat = (toTable.seats.map(s => s.seat_number).sort((a, b) => b - a)[0] || 0) + 1
    await supabase.from('table_seats').insert({
      table_id: toTableId, event_id: eventId,
      seat_number: nextSeat, guest_id: guest.id, party_size: needed,
    })
    await loadData(); setMoveModal(null); setMoveSaving(false)
  }

  const removeGuest = async (seatId: string, guestName: string) => {
    if (!confirm(`¿Quitar a ${guestName} de esta mesa?`)) return
    await supabase.from('table_seats').delete().eq('id', seatId)
    await loadData()
  }

  const toggleExpand = (tableId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(tableId) ? next.delete(tableId) : next.add(tableId)
      return next
    })
  }

  // ── Componentes ───────────────────────────────────────────────────────────

  const TagChips = ({ tags }: { tags: string[] }) => (
    <>
      {tags.length === 0
        ? <span className="text-[11px] text-[#ddd]">—</span>
        : tags.map(tag => {
            const idx = eventTags.indexOf(tag)
            const col = TAG_COLORS[idx >= 0 ? idx % TAG_COLORS.length : 0]
            return (
              <span key={tag} className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium"
                style={{ background: col.bg, borderColor: col.border, color: col.text }}>
                {tag}
              </span>
            )
          })
      }
    </>
  )

  const GuestCard = ({ seat, compact = false }: { seat: SeatRecord; compact?: boolean }) => {
    const guest  = seat.guest
    const status = guest ? STATUS_COLORS[guest.rsvp_status] : null
    if (!guest) return null
    return (
      <div className="rounded-xl border px-3 py-2.5"
        style={{ background: status!.bg, borderColor: status!.border }}>
        <div className="flex items-start justify-between gap-2">
          <button
            className="flex min-w-0 items-center gap-1.5 text-left"
            onClick={() => openEditGuest(guest)}>
            <span className="truncate text-sm font-semibold hover:underline" style={{ color: status!.text }}>
              {guest.name}
            </span>
            {guest.party_size > 1 && (
              <span className="shrink-0 text-sm font-semibold" style={{ color: status!.text }}>
                +{guest.party_size - 1}
              </span>
            )}
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: status!.text }}>
              {status!.label}
            </span>
            <button
              onClick={() => removeGuest(seat.id, guest.name)}
              className="rounded p-0.5 transition"
              style={{ color: status!.text, opacity: 0.4 }}
              title="Quitar de mesa">
              <X width={12} height={12} />
            </button>
          </div>
        </div>
        {guest.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <TagChips tags={guest.tags} />
          </div>
        )}
        {guest.notes && !compact && (
          <p className="mt-1 truncate text-[11px]" style={{ color: status!.text, opacity: 0.7 }}>
            {guest.notes}
          </p>
        )}
        {guest.party_members.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1 border-t pt-1.5" style={{ borderColor: status!.border }}>
            {guest.party_members.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-[2px] shrink-0 rounded-full opacity-30" style={{ background: status!.text }} />
                  <span className="text-xs" style={{ color: status!.text }}>{m.name || 'Acompañante'}</span>
                </div>
                <span className="shrink-0 text-[11px] font-medium" style={{ color: STATUS_COLORS[m.rsvp_status].text }}>
                  {STATUS_COLORS[m.rsvp_status].label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#48C9B0]" />
          <p className="text-sm text-[#999]">Cargando mesas...</p>
        </div>
      </div>
    )
  }

  const totalSeats     = tables.reduce((acc, t) => acc + t.capacity, 0)
  const totalOccupied  = tables.reduce((acc, t) => acc + getOccupied(t), 0)
  const totalAvailable = totalSeats - totalOccupied
  const cols = '28px 36px 24px 1.8fr 90px 100px 1fr 80px 60px 56px'

  const listFilteredTables = listSearch
    ? tables.map(t => ({
        ...t,
        seats: t.seats.filter(s =>
          s.guest?.name.toLowerCase().includes(listSearch.toLowerCase()) ||
          s.guest?.party_members.some(m => m.name?.toLowerCase().includes(listSearch.toLowerCase()))
        )
      })).filter(t => t.seats.length > 0 || t.name?.toLowerCase().includes(listSearch.toLowerCase()))
    : tables

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'visible', background: '#ffffff', color: '#1D1E20' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #e8e8e8' }} className="px-4 pt-4 pb-0 sm:px-6 sm:pt-5 lg:px-10 lg:pt-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl lg:text-2xl">Mesas</h1>
          <p className="mt-0.5 text-xs text-[#888] sm:text-sm">Organiza a tus invitados por mesa</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Mesas',          value: tables.length,  color: '#1D1E20' },
            { label: 'Total asientos', value: totalSeats,     color: '#1D1E20' },
            { label: 'Asignados',      value: totalOccupied,  color: '#2a7a50' },
            { label: 'Disponibles',    value: totalAvailable, color: '#48C9B0' },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-[#e8e8e8] bg-[#f8f8f8] p-2 text-center">
              <div className="text-lg font-bold sm:text-xl" style={{ color: m.color }}>{m.value}</div>
              <div className="text-[10px] text-[#999]">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[#e0e0e0]">
            <button onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition
                ${viewMode === 'cards' ? 'bg-[#1D1E20] text-white' : 'text-[#888] hover:bg-[#f5f5f5]'}`}>
              <LayoutGrid width={13} height={13} />
              <span className="hidden sm:inline">Por mesa</span>
            </button>
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 border-l border-[#e0e0e0] px-3 py-1.5 text-xs font-medium transition
                ${viewMode === 'list' ? 'bg-[#1D1E20] text-white' : 'text-[#888] hover:bg-[#f5f5f5]'}`}>
              <List width={13} height={13} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button onClick={() => setShowComingSoon(true)}
              className="flex items-center gap-1.5 border-l border-[#e0e0e0] px-3 py-1.5 text-xs font-medium text-[#888] transition hover:bg-[#f5f5f5]">
              <MapIcon width={13} height={13} />
              <span className="hidden sm:inline">Canvas</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search width={13} height={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
              <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)}
                placeholder="Buscar invitado..."
                className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] py-1.5 pl-8 pr-3 text-xs text-[#1D1E20] outline-none focus:border-[#48C9B0]" />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {tables.length > 0 && (
              <button onClick={handlePrint}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#666] transition hover:border-[#48C9B0] hover:text-[#48C9B0]">
                <Printer width={13} height={13} />
                Imprimir lista
              </button>
            )}
            <button onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3ab89f] sm:px-4 sm:text-sm">
              <Plus width={14} height={14} />
              Nueva mesa
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="px-4 pb-6 pt-3 sm:px-6 lg:px-10">

        {tables.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#e0e0e0] px-6 py-14 text-center">
            <div className="mb-3 text-3xl">🪑</div>
            <p className="text-sm text-[#888]">Sin mesas aún</p>
            <p className="mt-1 text-xs text-[#bbb]">Crea tu primera mesa para empezar a organizar a tus invitados</p>
            <button onClick={openCreate} className="mt-4 rounded-lg bg-[#48C9B0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3ab89f]">
              + Nueva mesa
            </button>
          </div>

        ) : viewMode === 'cards' ? (
          <div className="flex flex-col gap-4">
            {tables.map(table => {
              const occupied  = getOccupied(table)
              const available = table.capacity - occupied
              const isFull    = available === 0
              const isOpen    = expanded.has(table.id)
              return (
                <div key={table.id} className="rounded-xl border border-[#e8e8e8] bg-white">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f8f8f8] text-lg">
                      {table.shape === 'round' ? '⭕' : '▭'}
                    </div>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEditTable(table)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1D1E20]">Mesa {table.number}</span>
                        {table.name && <span className="truncate text-xs text-[#888]">— {table.name}</span>}
                        {isFull && <span className="rounded-full border border-[#a0e0c0] bg-[#f0fff6] px-2 py-0.5 text-[10px] font-semibold text-[#2a7a50]">Llena</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-[#999]">
                          <Users width={11} height={11} />
                          <span>{occupied}/{table.capacity}</span>
                        </div>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e8e8e8]">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min((occupied / table.capacity) * 100, 100)}%`, background: isFull ? '#48C9B0' : '#a0e0c0' }} />
                        </div>
                        <span className="text-[11px] text-[#bbb]">{available} disponibles</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => toggleExpand(table.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0]">
                        {isOpen ? <ChevronUp width={14} height={14} /> : <ChevronDown width={14} height={14} />}
                      </button>
                      <button onClick={() => handleDeleteTable(table)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ffe0e0] bg-[#fff5f5] text-[#cc3333] transition hover:bg-[#ffe8e8]">
                        <Trash2 width={13} height={13} />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-[#f0f0f0] px-4 py-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {table.seats.map(seat => <GuestCard key={seat.id} seat={seat} />)}
                        {!isFull && (
                          <button
                            onClick={() => { setAssignModal({ tableId: table.id, tableCapacity: table.capacity }); setAssignSearch('') }}
                            className="flex items-center gap-2 rounded-xl border border-dashed border-[#e0e0e0] px-3 py-2.5 text-left transition hover:border-[#48C9B0] hover:bg-[#f0fdfb]">
                            <Plus width={12} height={12} className="text-[#48C9B0]" />
                            <span className="text-xs text-[#aaa]">Asignar invitado ({available} libre{available !== 1 ? 's' : ''})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        ) : (
          <>
            {/* Desktop lista */}
            <div className="hidden overflow-visible rounded-xl border border-[#e8e8e8] sm:block">
              <div className="grid items-center border-b border-[#e8e8e8] bg-[#f8f8f8] px-4 py-2"
                style={{ gridTemplateColumns: cols }}>
                <div /><div /><div />
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">Invitado</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">Status</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">Tags</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">Notas</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">Asientos</div>
                <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-[#aaa]">Llegó</div>
                <div />
              </div>

              {listFilteredTables.map((table, idx) => {
                const occupied  = getOccupied(table)
                const available = table.capacity - occupied
                const isFull    = available === 0
                const isOpen    = expanded.has(table.id)
                const rowBg     = idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'
                return (
                  <div key={table.id}>
                    <div className={`grid items-center px-4 py-3 ${rowBg} border-b border-[#f0f0f0]`}
                      style={{ gridTemplateColumns: cols }}>
                      <div className="text-sm">{table.shape === 'round' ? '⭕' : '▭'}</div>
                      <div className="text-sm font-bold text-[#1D1E20]">{table.number}</div>
                      <div />
                      <div className="cursor-pointer" onClick={() => openEditTable(table)}>
                        <span className="text-sm font-semibold text-[#1D1E20] transition hover:text-[#48C9B0]">
                          {table.name || <span className="font-normal text-[#ccc]">Sin nombre</span>}
                        </span>
                        {isFull && <span className="ml-2 rounded-full border border-[#a0e0c0] bg-[#f0fff6] px-1.5 py-0.5 text-[9px] font-semibold text-[#2a7a50]">Llena</span>}
                      </div>
                      <div /><div /><div />
                      <div className="text-sm text-[#888]">
                        <span className="font-semibold text-[#1D1E20]">{occupied}</span>/{table.capacity}
                        <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-[#e8e8e8]">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((occupied / table.capacity) * 100, 100)}%`, background: isFull ? '#48C9B0' : '#a0e0c0' }} />
                        </div>
                      </div>
                      <div />
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleExpand(table.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0]">
                          {isOpen ? <ChevronUp width={12} height={12} /> : <ChevronDown width={12} height={12} />}
                        </button>
                        <button onClick={() => handleDeleteTable(table)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffe0e0] bg-[#fff5f5] text-[#cc3333] transition hover:bg-[#ffe8e8]">
                          <Trash2 width={12} height={12} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <>
                        {table.seats.map(seat => {
                          const guest  = seat.guest
                          if (!guest) return null
                          const status = STATUS_COLORS[guest.rsvp_status]
                          return (
                            <div key={seat.id}>
                              <div className={`grid items-center border-b border-[#f5f5f5] px-4 py-2 ${rowBg}`}
                                style={{ gridTemplateColumns: cols }}>
                                <div /><div />
                                <div className="flex justify-center">
                                  <div className="h-5 w-[2px] rounded-full" style={{ background: status.border }} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => openEditGuest(guest)}
                                    className="text-xs font-semibold text-[#1D1E20] hover:text-[#48C9B0] hover:underline transition">
                                    {guest.name}
                                  </button>
                                  {guest.party_size > 1 && (
                                    <span className="rounded-full border border-[#9FE1CB] bg-[#f0fdfb] px-1.5 py-0.5 text-[9px] font-semibold text-[#0F6E56]">
                                      +{guest.party_size - 1}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                    style={{ background: status.bg, borderColor: status.border, color: status.text }}>
                                    {status.label.slice(0, 4)}.
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1"><TagChips tags={guest.tags} /></div>
                                <div className="truncate text-[11px] text-[#aaa]" title={guest.notes || ''}>
                                  {guest.notes || <span className="text-[#ddd]">—</span>}
                                </div>
                                <div />
                                <div className="flex justify-center">
                                  <button onClick={() => toggleCheckin(guest.id, guest.checked_in)}
                                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition
                                      ${guest.checked_in ? 'border-[#48C9B0] bg-[#48C9B0]' : 'border-[#d0d0d0] bg-white hover:border-[#48C9B0]'}`}>
                                    {guest.checked_in && (
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </button>
                                </div>
                                <div className="flex justify-end">
                                  <button onClick={() => removeGuest(seat.id, guest.name)}
                                    className="flex h-6 w-6 items-center justify-center rounded text-[#ccc] transition hover:text-[#cc3333]">
                                    <X width={11} height={11} />
                                  </button>
                                </div>
                              </div>
                              {guest.party_members.map(m => (
                                <div key={m.id} className={`grid items-center border-b border-[#f5f5f5] px-4 py-1.5 ${rowBg}`}
                                  style={{ gridTemplateColumns: cols }}>
                                  <div /><div />
                                  <div className="flex justify-center">
                                    <div className="h-4 w-[2px] rounded-full opacity-25" style={{ background: status.border }} />
                                  </div>
                                  <div className="flex items-center gap-1.5 pl-3">
                                    <span className="text-[11px] text-[#888]">{m.name || 'Acompañante'}</span>
                                  </div>
                                  <div>
                                    <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold"
                                      style={{ background: STATUS_COLORS[m.rsvp_status].bg, borderColor: STATUS_COLORS[m.rsvp_status].border, color: STATUS_COLORS[m.rsvp_status].text }}>
                                      {STATUS_COLORS[m.rsvp_status].label.slice(0, 4)}.
                                    </span>
                                  </div>
                                  <div /><div /><div />
                                  <div className="flex justify-center">
                                    <button onClick={() => toggleMemberCheckin(m.id, guest.id, m.checked_in)}
                                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition
                                        ${m.checked_in ? 'border-[#48C9B0] bg-[#48C9B0]' : 'border-[#d0d0d0] bg-white hover:border-[#48C9B0]'}`}>
                                      {m.checked_in && (
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                  <div />
                                </div>
                              ))}
                            </div>
                          )
                        })}
                        {!isFull && (
                          <div className={`border-b border-[#f0f0f0] px-4 py-2 ${rowBg}`}>
                            <button
                              onClick={() => { setAssignModal({ tableId: table.id, tableCapacity: table.capacity }); setAssignSearch('') }}
                              className="flex items-center gap-1.5 text-xs text-[#48C9B0] transition hover:underline">
                              <Plus width={11} height={11} />
                              Asignar invitado ({available} libre{available !== 1 ? 's' : ''})
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Mobile lista */}
            <div className="flex flex-col gap-3 sm:hidden">
              {listFilteredTables.map(table => {
                const occupied  = getOccupied(table)
                const available = table.capacity - occupied
                const isFull    = available === 0
                const isOpen    = expanded.has(table.id)
                return (
                  <div key={table.id} className="rounded-xl border border-[#e8e8e8] bg-white">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f8f8f8] text-base">
                        {table.shape === 'round' ? '⭕' : '▭'}
                      </div>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEditTable(table)}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1D1E20]">{table.name || `Mesa ${table.number}`}</span>
                          {table.name && <span className="text-xs text-[#aaa]">#{table.number}</span>}
                          {isFull && <span className="rounded-full border border-[#a0e0c0] bg-[#f0fff6] px-1.5 py-0.5 text-[9px] font-semibold text-[#2a7a50]">Llena</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-[#888]">{occupied}/{table.capacity}</span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e8e8e8]">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((occupied / table.capacity) * 100, 100)}%`, background: isFull ? '#48C9B0' : '#a0e0c0' }} />
                          </div>
                          <span className="text-[11px] text-[#bbb]">{available} libres</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => toggleExpand(table.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888]">
                          {isOpen ? <ChevronUp width={14} height={14} /> : <ChevronDown width={14} height={14} />}
                        </button>
                        <button onClick={() => handleDeleteTable(table)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ffe0e0] bg-[#fff5f5] text-[#cc3333]">
                          <Trash2 width={13} height={13} />
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-[#f0f0f0] px-3 py-2">
                        <div className="flex flex-col gap-2">
                          {table.seats.map(seat => <GuestCard key={seat.id} seat={seat} compact />)}
                        </div>
                        {!isFull && (
                          <button
                            onClick={() => { setAssignModal({ tableId: table.id, tableCapacity: table.capacity }); setAssignSearch('') }}
                            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#e0e0e0] px-3 py-2 text-left transition hover:border-[#48C9B0] hover:bg-[#f0fdfb]">
                            <Plus width={12} height={12} className="text-[#48C9B0]" />
                            <span className="text-xs text-[#aaa]">Asignar invitado ({available} libres)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL: Editar invitado */}
      {editGuest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-y-auto rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl sm:p-8" style={{ maxHeight: '90vh' }}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Editar invitado</h2>
              <button onClick={() => setEditGuest(null)} className="text-xl text-[#aaa]">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555]">Nombre *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inpStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555]">WhatsApp</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+52 81 1234 5678" style={inpStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555]">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inpStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555]">Notas</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Mesa preferida, restricciones..." rows={2} style={{ ...inpStyle, resize: 'vertical' }} />
              </div>
              {eventTags.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Tags</label>
                  <TagSelector availableTags={eventTags} selectedTags={editTags} onChange={setEditTags} />
                </div>
              )}
              <div className="border-t border-[#f0f0f0] pt-4">
                <MembersEditor value={editMembers} onChange={setEditMembers} />
              </div>
            </div>
            {editError && (
              <div className="mt-3 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] p-2.5 text-xs text-[#cc3333]">{editError}</div>
            )}
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setEditGuest(null)} className="flex-1 rounded-lg border border-[#e0e0e0] py-3 text-sm text-[#888]">Cancelar</button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-[2] rounded-lg bg-[#48C9B0] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Asignar invitado */}
      {assignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => { setAssignModal(null); setAssignSearch('') }}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {(() => {
              const table     = tables.find(t => t.id === assignModal.tableId)!
              const occupied  = getOccupied(table)
              const available = assignModal.tableCapacity - occupied
              return (
                <>
                  <div className="border-b border-[#f0f0f0] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1D1E20]">
                          Asignar a Mesa {table.number}{table.name ? ` — ${table.name}` : ''}
                        </p>
                        <p className="text-[11px] text-[#bbb]">{available} asiento(s) disponible(s)</p>
                      </div>
                      <button onClick={() => { setAssignModal(null); setAssignSearch('') }} className="text-[#aaa] hover:text-[#1D1E20]">
                        <X width={16} height={16} />
                      </button>
                    </div>
                    <div className="relative mt-3">
                      <Search width={13} height={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
                      <input ref={assignSearchRef} type="text" value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                        placeholder="Buscar invitado..."
                        className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] py-2 pl-8 pr-3 text-xs outline-none focus:border-[#48C9B0]" />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {assignFilteredGuests.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-[#bbb]">Sin resultados</p>
                    ) : (
                      assignFilteredGuests.map(g => {
                        const needed      = g.party_size || 1
                        const existing    = guestSeatMap.get(g.id)
                        const isHere      = existing?.tableId === assignModal.tableId
                        const isElsewhere = existing && !isHere
                        const cabeFit     = needed <= available && !isHere
                        return (
                          <button key={g.id}
                            onClick={() => !isHere && handleSelectGuest(g.id, assignModal.tableId, assignModal.tableCapacity)}
                            disabled={isHere}
                            className={`flex w-full items-center gap-3 border-b border-[#f5f5f5] px-4 py-3 text-left transition last:border-0
                              ${isHere ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#f0fdfb] cursor-pointer'}`}>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-semibold text-[#1D1E20]">{g.name}</span>
                                {needed > 1 && (
                                  <span className="shrink-0 rounded-full border border-[#9FE1CB] bg-[#f0fdfb] px-1.5 text-[9px] font-semibold text-[#0F6E56]">
                                    +{needed - 1}
                                  </span>
                                )}
                                {isElsewhere && (
                                  <span className="shrink-0 rounded-full border border-[#f0d080] bg-[#fffbf0] px-1.5 text-[9px] font-semibold text-[#b8860b]">
                                    Mesa {existing.tableNumber}
                                  </span>
                                )}
                              </div>
                              {!cabeFit && !isHere && !isElsewhere && (
                                <span className="text-[10px] text-[#cc3333]">Necesita {needed} asientos — solo hay {available}</span>
                              )}
                              {isElsewhere && <span className="text-[10px] text-[#b8860b]">Mover a esta mesa</span>}
                            </div>
                            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                              style={{ background: STATUS_COLORS[g.rsvp_status].bg, borderColor: STATUS_COLORS[g.rsvp_status].border, color: STATUS_COLORS[g.rsvp_status].text }}>
                              {STATUS_COLORS[g.rsvp_status].label.slice(0, 4)}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Crear / Editar mesa */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1D1E20]">{editTable ? 'Editar mesa' : 'Nueva mesa'}</h2>
              <button onClick={() => setShowModal(false)} className="text-xl text-[#aaa]">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]"># Mesa *</label>
                  <input type="number" min="1" value={modalNumber} onChange={e => setModalNumber(e.target.value)} className={inp} placeholder="1" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Capacidad *</label>
                  <input type="number" min="1" max="100" value={modalCap} onChange={e => setModalCap(e.target.value)} className={inp} placeholder="8" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555]">Nombre <span className="font-normal text-[#ccc]">(opcional)</span></label>
                <input type="text" value={modalName} onChange={e => setModalName(e.target.value)} className={inp} placeholder="Ej: Mesa de honor, Familia García..." />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#555]">Forma</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['round', 'rectangle'] as const).map(shape => (
                    <button key={shape} type="button" onClick={() => setModalShape(shape)}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition
                        ${modalShape === shape ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]' : 'border-[#e0e0e0] text-[#888] hover:border-[#48C9B0]'}`}>
                      <span className="text-lg">{shape === 'round' ? '⭕' : '▭'}</span>
                      <span>{shape === 'round' ? 'Redonda' : 'Rectangular'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {modalError && (
              <div className="mt-3 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] p-2.5 text-xs text-[#cc3333]">{modalError}</div>
            )}
            <div className="mt-5 flex gap-2.5">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-[#e0e0e0] py-3 text-sm text-[#888]">Cancelar</button>
              <button onClick={handleSaveTable} disabled={modalSaving}
                className="flex-[2] rounded-lg bg-[#48C9B0] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {modalSaving ? 'Guardando...' : editTable ? 'Guardar cambios' : 'Crear mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Mover invitado */}
      {moveModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mb-3 text-3xl">🔄</div>
              <h2 className="text-base font-bold text-[#1D1E20]">¿Mover a otra mesa?</h2>
              <p className="mt-2 text-sm text-[#555]">
                <span className="font-semibold">{moveModal.guest.name}</span>
                {moveModal.guest.party_size > 1 && <span className="text-[#888]"> +{moveModal.guest.party_size - 1}</span>}
                {' '}está en <span className="font-semibold">Mesa {moveModal.fromTableNumber}</span>.
                {' '}¿Mover a <span className="font-semibold">Mesa {tables.find(t => t.id === moveModal.toTableId)?.number}</span>?
              </p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setMoveModal(null)} className="flex-1 rounded-lg border border-[#e0e0e0] py-3 text-sm text-[#888]">Cancelar</button>
              <button onClick={handleConfirmMove} disabled={moveSaving}
                className="flex-[2] rounded-lg bg-[#48C9B0] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {moveSaving ? 'Moviendo...' : 'Sí, mover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle invitado mobile */}
      {guestDetail && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setGuestDetail(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1D1E20]">{guestDetail.name}</h2>
              <button onClick={() => setGuestDetail(null)} className="text-xl text-[#aaa]">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-[#aaa]">Status</span>
                <span className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{ background: STATUS_COLORS[guestDetail.rsvp_status].bg, borderColor: STATUS_COLORS[guestDetail.rsvp_status].border, color: STATUS_COLORS[guestDetail.rsvp_status].text }}>
                  {STATUS_COLORS[guestDetail.rsvp_status].label}
                </span>
              </div>
              {guestDetail.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="w-16 shrink-0 text-xs text-[#aaa]">Tags</span>
                  <div className="flex flex-wrap gap-1"><TagChips tags={guestDetail.tags} /></div>
                </div>
              )}
              {guestDetail.notes && (
                <div className="flex items-start gap-2">
                  <span className="w-16 shrink-0 text-xs text-[#aaa]">Notas</span>
                  <span className="text-xs text-[#555]">{guestDetail.notes}</span>
                </div>
              )}
              {guestDetail.party_members.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="w-16 shrink-0 text-xs text-[#aaa]">Acomp.</span>
                  <div className="flex flex-col gap-1">
                    {guestDetail.party_members.map(m => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="text-xs text-[#555]">{m.name || 'Acompañante'}</span>
                        <span className="text-[9px]" style={{ color: STATUS_COLORS[m.rsvp_status].text }}>
                          {STATUS_COLORS[m.rsvp_status].label.slice(0, 4)}.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Canvas próximamente */}
      {showComingSoon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowComingSoon(false)}>
          <div className="w-full max-w-xs rounded-2xl border border-[#e8e8e8] bg-white p-8 text-center shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-3 text-4xl">🗺️</div>
            <h2 className="text-lg font-bold text-[#1D1E20]">Canvas</h2>
            <p className="mt-2 text-sm text-[#888]">Muy pronto podrás organizar tus mesas en un plano visual interactivo.</p>
            <div className="mt-4 rounded-lg border border-[#e8f8f4] bg-[#f0fdfb] px-4 py-2.5 text-xs font-semibold text-[#1a9e88]">
              Próximamente ✨
            </div>
            <button onClick={() => setShowComingSoon(false)}
              className="mt-4 w-full rounded-lg border border-[#e0e0e0] py-2.5 text-sm text-[#888]">
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}