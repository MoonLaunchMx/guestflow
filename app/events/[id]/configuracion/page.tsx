'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EventStatus } from '@/lib/types'

const EVENT_TYPES = [
  { value: 'boda',        label: '💍 Boda' },
  { value: 'cumpleanos',  label: '🎂 Cumpleaños' },
  { value: 'fiesta',      label: '🎉 Fiesta' },
  { value: 'corporativo', label: '💼 Corporativo' },
  { value: 'bautizo',     label: '🕊️ Bautizo' },
  { value: 'otro',        label: '📅 Otro' },
]

const VARIABLES = [
  { key: '{nombre}',    label: 'nombre' },
  { key: '{evento}',    label: 'evento' },
  { key: '{fecha}',     label: 'fecha' },
  { key: '{hora}',      label: 'hora' },
  { key: '{venue}',     label: 'venue' },
  { key: '{direccion}', label: 'direccion' },
  { key: '{playlist}',  label: 'playlist' },
]

const DEFAULT_NAMES = [
  'Bienvenida', 'Recordatorio', 'Confirmación', 'Invitación playlist',
  'Invitación fotos', 'Plantilla 6', 'Plantilla 7', 'Plantilla 8', 'Plantilla 9', 'Plantilla 10',
]

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

const STATUS_STYLES: Record<EventStatus, { dot: string; badge: string; label: string }> = {
  active:    { dot: 'bg-[#48C9B0]', badge: 'border-[#c8ede7] bg-[#f0fdfb] text-[#1a9e88]', label: 'Activo' },
  paused:    { dot: 'bg-blue-400',  badge: 'border-blue-200 bg-blue-50 text-blue-700',       label: 'Pausado' },
  cancelled: { dot: 'bg-red-400',   badge: 'border-red-200 bg-red-50 text-red-600',          label: 'Cancelado' },
  completed: { dot: 'bg-[#888]',    badge: 'border-[#e0e0e0] bg-[#f8f8f8] text-[#888]',     label: 'Completado' },
}

const STATUS_OPTIONS: { status: EventStatus; label: string; dot: string }[] = [
  { status: 'active',    label: 'Activo',    dot: 'bg-[#48C9B0]' },
  { status: 'paused',    label: 'Pausado',   dot: 'bg-blue-400' },
  { status: 'cancelled', label: 'Cancelado', dot: 'bg-red-400' },
]

function getTagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length]
}

function TemplateInput({
  index, value, name, onChange, onNameChange, placeholder, onDelete, onClear, canDelete,
}: {
  index: number
  value: string
  name: string
  onChange: (val: string) => void
  onNameChange: (val: string) => void
  placeholder: string
  onDelete?: () => void
  onClear?: () => void
  canDelete?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const insertVariable = (variable: string) => {
    const el = textareaRef.current
    if (!el) { onChange(value + variable); return }
    const start = el.selectionStart
    const end = el.selectionEnd
    const newVal = value.substring(0, start) + variable + value.substring(end)
    onChange(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const startEditName = () => {
    setNameInput(name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  const commitName = () => {
    const trimmed = nameInput.trim()
    onNameChange(trimmed || DEFAULT_NAMES[index])
    setEditingName(false)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') { setEditingName(false); setNameInput(name) }
              }}
              className="rounded border border-[#48C9B0] bg-white px-2 py-0.5 text-xs font-semibold text-[#1D1E20] outline-none"
              style={{ minWidth: 0, width: Math.max(nameInput.length, 8) + 'ch' }}
            />
          ) : (
            <button
              onDoubleClick={startEditName}
              title="Doble click para renombrar"
              className="group flex items-center gap-1 text-xs font-semibold text-[#555] transition hover:text-[#48C9B0]"
            >
              {name}
              <span className="opacity-0 text-[10px] text-[#bbb] transition group-hover:opacity-100">✎</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onClear && (
            <button onClick={onClear} title="Limpiar contenido" className="text-xs text-[#888] transition hover:text-[#1D1E20]">
              Limpiar
            </button>
          )}
          {canDelete && onDelete && (
            <button onClick={onDelete} title="Eliminar plantilla" className="text-xs text-[#cc3333] transition hover:text-[#aa2222]">
              - Eliminar
            </button>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 font-sans text-sm leading-relaxed text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {VARIABLES.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            className="rounded-full border border-[#e0e0e0] bg-[#f8f8f8] px-2 py-0.5 font-mono text-[11px] text-[#888] transition hover:border-[#48C9B0] hover:bg-[#f0fdfb] hover:text-[#1a9e88]"
          >
            {'{' + v.label + '}'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')
  const autoSaveTimeoutRef                = useRef<NodeJS.Timeout | null>(null)
  const hasChangesRef                     = useRef(false)

  // — datos de events —
  const [name, setName]                   = useState('')
  const [eventType, setEventType]         = useState('')
  const [eventDate, setEventDate]         = useState('')
  const [eventEndDate, setEventEndDate]   = useState('')
  const [eventTime, setEventTime]         = useState('')
  const [venue, setVenue]                 = useState('')
  const [address, setAddress]             = useState('')
  const [eventStatus, setEventStatus]     = useState<EventStatus>('active')
  const [guestTags, setGuestTags]         = useState<string[]>([])
  const [newTag, setNewTag]               = useState('')

  // — datos de event_settings —
  const [settingsId, setSettingsId]       = useState<string | null>(null)
  const [templates, setTemplates]         = useState<string[]>(Array(10).fill(''))
  const [templateNames, setTemplateNames] = useState<string[]>([...DEFAULT_NAMES])
  const [visibleTemplates, setVisibleTemplates] = useState(2)

  // — status dropdown —
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [statusSaving, setStatusSaving]   = useState(false)
  const dropdownRef                       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { loadEvent() }, [])

  const loadEvent = async () => {
    const [{ data: eventData }, { data: settingsData }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('event_settings').select('*').eq('event_id', id).single(),
    ])

    if (eventData) {
      setName(eventData.name || '')
      setEventType(eventData.event_type || '')
      setEventDate(eventData.event_date ? eventData.event_date.split('T')[0] : '')
      setEventEndDate(eventData.event_end_date ? eventData.event_end_date.split('T')[0] : '')
      setEventTime(eventData.event_time || '')
      setVenue(eventData.venue || '')
      setAddress(eventData.address || '')
      setEventStatus(eventData.event_status || 'active')
      setGuestTags(Array.isArray(eventData.guest_tags) ? eventData.guest_tags : [])
    }

    if (settingsData) {
      setSettingsId(settingsData.id)

      if (Array.isArray(settingsData.message_templates)) {
        const loaded = [...settingsData.message_templates, ...Array(10).fill('')].slice(0, 10)
        setTemplates(loaded)
        let lastFilledIndex = -1
        for (let i = loaded.length - 1; i >= 0; i--) {
          if (loaded[i]?.trim()) { lastFilledIndex = i; break }
        }
        setVisibleTemplates(Math.max(2, lastFilledIndex + 1))
      }

      if (Array.isArray(settingsData.template_names)) {
        const loadedNames = [...settingsData.template_names, ...DEFAULT_NAMES].slice(0, 10)
        setTemplateNames(loadedNames.map((n: string, i: number) => n || DEFAULT_NAMES[i]))
      }
    }

    setLoading(false)
  }

  const handleSave = async (autoSave = false) => {
    if (!name) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(''); setSaved(false)

    const { error: eventErr } = await supabase.from('events').update({
      name,
      event_type: eventType || null,
      event_date: eventDate || null,
      event_end_date: eventEndDate || null,
      event_time: eventTime || null,
      venue: venue || null,
      address: address || null,
      guest_tags: guestTags,
    }).eq('id', id)

    if (eventErr) { setError('Error: ' + eventErr.message); setSaving(false); return }

    // Solo guarda templates — NO toca playlist_token ni playlist_categories
    const { error: settingsErr } = await supabase.from('event_settings').upsert({
      ...(settingsId ? { id: settingsId } : {}),
      event_id: id,
      message_templates: templates,
      template_names: templateNames,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id' })

    if (settingsErr) { setError('Error: ' + settingsErr.message); setSaving(false); return }

    setSaving(false); setSaved(true)
    hasChangesRef.current = false

    if (!autoSave) {
      setTimeout(() => window.location.reload(), 800)
    } else {
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const scheduleAutoSave = () => {
    hasChangesRef.current = true
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (hasChangesRef.current && name) handleSave(true)
    }, 2000)
  }

  useEffect(() => {
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current) }
  }, [])

  const handleStatusChange = async (newStatus: EventStatus) => {
    setStatusSaving(true)
    setShowStatusDropdown(false)
    const { error: err } = await supabase.from('events').update({ event_status: newStatus }).eq('id', id)
    if (!err) setEventStatus(newStatus)
    setStatusSaving(false)
  }

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed || guestTags.includes(trimmed)) return
    setGuestTags(prev => [...prev, trimmed])
    setNewTag('')
    scheduleAutoSave()
  }

  const handleRemoveTag = (tag: string) => {
    setGuestTags(prev => prev.filter(t => t !== tag))
    scheduleAutoSave()
  }

  const updateTemplate = (i: number, value: string) => {
    setTemplates(prev => prev.map((t, idx) => idx === i ? value : t))
    scheduleAutoSave()
  }

  const updateTemplateName = (i: number, value: string) => {
    setTemplateNames(prev => prev.map((n, idx) => idx === i ? value : n))
    scheduleAutoSave()
  }

  const handleDeleteTemplate = (i: number) => {
    if (!confirm('¿Eliminar esta plantilla? No se puede deshacer.')) return
    const newTemplates = templates.filter((_, idx) => idx !== i)
    while (newTemplates.length < 10) newTemplates.push('')
    const newNames = templateNames.filter((_, idx) => idx !== i)
    while (newNames.length < 10) newNames.push(DEFAULT_NAMES[newNames.length])
    setTemplates(newTemplates)
    setTemplateNames(newNames)
    setVisibleTemplates(Math.max(1, visibleTemplates - 1))
    scheduleAutoSave()
  }

  const handleClearTemplate = (i: number) => {
    setTemplates(prev => prev.map((t, idx) => idx === i ? '' : t))
    scheduleAutoSave()
  }

  const openMaps = () => {
    window.open('https://maps.google.com?q=' + encodeURIComponent(address), '_blank')
  }

  const eventDays = eventDate && eventEndDate
    ? Math.max(1, Math.round((new Date(eventEndDate).getTime() - new Date(eventDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : null

  if (loading) return <div className="p-8 text-sm text-[#666]">Cargando...</div>

  const badgeStyle = STATUS_STYLES[eventStatus]
  const dropdownOptions = STATUS_OPTIONS.filter(o => o.status !== eventStatus)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* ══ HEADER ══ */}
      <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Configuración</h1>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={statusSaving}
                  className={'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition hover:opacity-80 disabled:opacity-50 ' + badgeStyle.badge}
                >
                  <span className={'h-1.5 w-1.5 rounded-full ' + badgeStyle.dot} />
                  {statusSaving ? 'Guardando...' : badgeStyle.label}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showStatusDropdown && (
                  <div className="absolute left-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-lg">
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#bbb]">Cambiar estado</div>
                    {dropdownOptions.map(opt => (
                      <button key={opt.status} onClick={() => handleStatusChange(opt.status)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-[#555] transition hover:bg-[#f8f8f8]">
                        <span className={'h-2 w-2 rounded-full ' + opt.dot} />{opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-[#666] sm:text-sm">Datos generales y plantillas de WhatsApp</p>
          </div>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className={(saved ? 'border border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]' : saving ? 'bg-[#a0e0d8] text-white' : 'bg-[#48C9B0] text-white hover:bg-[#3ab89f]') + ' shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed sm:px-5 sm:py-2.5'}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] px-3 py-2.5 text-xs text-[#cc3333]">{error}</div>
        )}
      </div>

      {/* ══ CONTENIDO ══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">

            {/* COLUMNA IZQUIERDA */}
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-[#1D1E20] sm:text-lg">📋 Datos del evento</h2>
                <div className="flex flex-col gap-3 sm:gap-4">

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Nombre *</label>
                    <input type="text" value={name} onChange={e => { setName(e.target.value); scheduleAutoSave() }}
                      placeholder="Boda Ana & Carlos"
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Tipo de evento</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EVENT_TYPES.map(type => (
                        <button key={type.value} onClick={() => { setEventType(type.value); scheduleAutoSave() }}
                          className={'rounded-lg border px-2.5 py-2 text-left text-xs transition ' + (eventType === type.value ? 'border-[#48C9B0] bg-[#f0fdfb] font-semibold text-[#1a9e88]' : 'border-[#e0e0e0] bg-white text-[#444] hover:border-[#48C9B0] hover:text-[#1a9e88]')}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#555]">Fecha de inicio</label>
                      <input type="date" value={eventDate} onChange={e => { setEventDate(e.target.value); scheduleAutoSave() }}
                        style={{ colorScheme: 'light' }}
                        className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#555]">
                        Fecha de término
                        <span className="ml-1 font-normal text-[#bbb]">(opcional)</span>
                      </label>
                      <input type="date" value={eventEndDate} min={eventDate || undefined}
                        onChange={e => { setEventEndDate(e.target.value); scheduleAutoSave() }}
                        style={{ colorScheme: 'light' }}
                        className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                      />
                    </div>
                  </div>

                  {eventDays && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-[#c8ede7] bg-[#f0fdfb] px-3 py-2">
                      <span className="text-sm">📅</span>
                      <span className="text-xs font-semibold text-[#1a9e88]">
                        {eventDays === 1 ? '1 día' : `${eventDays} días`}
                      </span>
                      <span className="text-xs text-[#888]">de duración</span>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Hora</label>
                    <input type="time" value={eventTime} onChange={e => { setEventTime(e.target.value); scheduleAutoSave() }}
                      style={{ colorScheme: 'light' }}
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Venue</label>
                    <input type="text" value={venue} onChange={e => { setVenue(e.target.value); scheduleAutoSave() }}
                      placeholder="Hacienda San Miguel"
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Dirección</label>
                    <div className="flex gap-2">
                      <input type="text" value={address} onChange={e => { setAddress(e.target.value); scheduleAutoSave() }}
                        placeholder="Carr. Saltillo-Monterrey Km 4.5"
                        className="flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                      />
                      {address && (
                        <button type="button" onClick={openMaps}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#d0d0d0] bg-white px-3 py-2 text-xs text-[#666] transition hover:border-[#48C9B0] hover:text-[#1a9e88]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          Maps
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Tags */}
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-1.5 text-base font-semibold text-[#1D1E20] sm:text-lg">🏷️ Tags para invitados</h2>
                <p className="mb-3 text-xs text-[#666]">Define las etiquetas que podrás asignar a tus invitados. Ej: VIP, Mesa 1, Vegetariano...</p>
                {guestTags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {guestTags.map((tag, i) => {
                      const col = getTagColor(i)
                      return (
                        <span key={tag} className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{ background: col.bg, borderColor: col.border, color: col.text }}>
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)}
                            className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-60 transition hover:opacity-100"
                            style={{ color: col.text }}>×</button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Nuevo tag..."
                    className="flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                  />
                  <button onClick={handleAddTag} disabled={!newTag.trim()}
                    className="shrink-0 rounded-lg bg-[#48C9B0] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-40">
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA — solo plantillas */}
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-1.5 text-base font-semibold text-[#1D1E20] sm:text-lg">💬 Plantillas de WhatsApp</h2>
                <p className="mb-4 text-xs text-[#666]">Doble click en el nombre para renombrarlo. Usa los chips para insertar variables.</p>
                <div className="flex flex-col gap-5">
                  {templates.slice(0, visibleTemplates).map((template, i) => (
                    <TemplateInput key={i} index={i} value={template}
                      name={templateNames[i] || DEFAULT_NAMES[i]}
                      onChange={val => updateTemplate(i, val)}
                      onNameChange={val => updateTemplateName(i, val)}
                      placeholder={i === 0 ? 'Hola {nombre}, te esperamos en {evento} el {fecha} a las {hora} 🎉' : 'Escribe aquí tu mensaje...'}
                      onDelete={() => handleDeleteTemplate(i)}
                      onClear={() => handleClearTemplate(i)}
                      canDelete={i > 0}
                    />
                  ))}
                  {visibleTemplates < 10 && (
                    <button onClick={() => setVisibleTemplates(v => Math.min(v + 1, 10))}
                      className="flex items-center gap-1.5 text-xs text-[#48C9B0] transition hover:text-[#3ab89f]">
                      <span className="text-base leading-none">+</span> Agregar plantilla
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}