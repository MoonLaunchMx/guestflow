'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

// Tipos de evento disponibles
const EVENT_TYPES = [
  { value: 'boda',        label: '💍 Boda' },
  { value: 'cumpleanos',  label: '🎂 Cumpleaños' },
  { value: 'fiesta',      label: '🎉 Fiesta' },
  { value: 'corporativo', label: '💼 Corporativo' },
  { value: 'bautizo',     label: '🕊️ Bautizo' },
  { value: 'otro',        label: '📅 Otro' },
]

// Variables dinámicas disponibles para las plantillas de WhatsApp
const VARIABLES = [
  { key: '{nombre}',   label: 'nombre' },
  { key: '{evento}',   label: 'evento' },
  { key: '{fecha}',    label: 'fecha' },
  { key: '{hora}',     label: 'hora' },
  { key: '{venue}',    label: 'venue' },
  { key: '{playlist}', label: 'playlist' },
]

// Nombres por defecto para las 10 plantillas de WhatsApp
const DEFAULT_NAMES = [
  'Bienvenida',
  'Recordatorio',
  'Confirmación',
  'Invitación playlist',
  'Invitación fotos',
  'Plantilla 6',
  'Plantilla 7',
  'Plantilla 8',
  'Plantilla 9',
  'Plantilla 10',
]

// Colores para los chips de tags en la vista de configuración
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

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

// Genera un token aleatorio para el link público de playlist
function generateToken(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Devuelve el color de un tag según su índice (cicla si hay más de 8)
function getTagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length]
}

// ─────────────────────────────────────────────
// COMPONENTE: Input de plantilla WhatsApp
// Permite editar el nombre (doble click) e insertar variables con chips
// ─────────────────────────────────────────────
function TemplateInput({
  index, value, name, onChange, onNameChange, placeholder,
}: {
  index: number
  value: string
  name: string
  onChange: (val: string) => void
  onNameChange: (val: string) => void
  placeholder: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Inserta la variable en la posición actual del cursor en el textarea
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
      {/* Nombre de la plantilla — doble click para editar */}
      <div className="mb-1.5 flex items-center gap-1.5">
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
            style={{ minWidth: 0, width: `${Math.max(nameInput.length, 8)}ch` }}
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

      {/* Textarea del mensaje */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 font-sans text-sm leading-relaxed text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
      />

      {/* Chips de variables — click inserta en el cursor */}
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

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL: Configuración del evento
// ─────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { id } = useParams()
  const router = useRouter()

  // ── Estado general ──
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')

  // ── Datos del evento ──
  const [name, setName]                   = useState('')
  const [eventType, setEventType]         = useState('')
  const [eventDate, setEventDate]         = useState('')
  const [eventTime, setEventTime]         = useState('')
  const [venue, setVenue]                 = useState('')
  const [address, setAddress]             = useState('')

  // ── Plantillas de WhatsApp ──
  const [templates, setTemplates]         = useState<string[]>(Array(10).fill(''))
  const [templateNames, setTemplateNames] = useState<string[]>([...DEFAULT_NAMES])
  const [visibleTemplates, setVisibleTemplates] = useState(2)

  // ── Tags de invitados ──
  const [guestTags, setGuestTags]         = useState<string[]>([])
  const [newTag, setNewTag]               = useState('')

  // ── Playlist ──
  const [playlistToken, setPlaylistToken] = useState('')
  const [categories, setCategories]       = useState<string[]>([])
  const [newCategory, setNewCategory]     = useState('')
  const [copied, setCopied]               = useState(false)

  // ── Eliminar evento ──
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  // ─────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────
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

      // Cargar plantillas (máximo 10)
      if (Array.isArray(data.message_templates)) {
        const loaded = [...data.message_templates, ...Array(10).fill('')].slice(0, 10)
        setTemplates(loaded)
        const filled = loaded.filter((t: string) => t.trim()).length
        setVisibleTemplates(Math.max(2, filled))
      }

      // Cargar nombres de plantillas
      if (Array.isArray(data.template_names)) {
        const loadedNames = [...data.template_names, ...DEFAULT_NAMES].slice(0, 10)
        setTemplateNames(loadedNames.map((n: string, i: number) => n || DEFAULT_NAMES[i]))
      }

      // Cargar tags de invitados
      setGuestTags(Array.isArray(data.guest_tags) ? data.guest_tags : [])

      // Cargar playlist
      setPlaylistToken(data.playlist_token || '')
      setCategories(Array.isArray(data.playlist_categories) ? data.playlist_categories : [])
    }
    setLoading(false)
  }

  // ─────────────────────────────────────────────
  // GUARDAR
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!name) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(''); setSaved(false)
    const { error: err } = await supabase.from('events').update({
      name, event_type: eventType || null, event_date: eventDate || null,
      event_time: eventTime || null, venue: venue || null,
      address: address || null, message_templates: templates,
      template_names: templateNames,
      guest_tags: guestTags,
      playlist_token: playlistToken || null,
      playlist_categories: categories,
    }).eq('id', id)
    if (err) { setError('Error: ' + err.message); setSaving(false); return }
    setSaving(false); setSaved(true)
    setTimeout(() => window.location.reload(), 800)
  }

  // ─────────────────────────────────────────────
  // TAGS DE INVITADOS
  // ─────────────────────────────────────────────
  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed || guestTags.includes(trimmed)) return
    setGuestTags(prev => [...prev, trimmed])
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setGuestTags(prev => prev.filter(t => t !== tag))
  }

  // ─────────────────────────────────────────────
  // PLAYLIST
  // ─────────────────────────────────────────────
  const handleGenerateToken = () => setPlaylistToken(generateToken())

  const handleCopyLink = () => {
    const url = `${window.location.origin}/playlist/${playlistToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddCategory = () => {
    const trimmed = newCategory.trim()
    if (!trimmed || categories.includes(trimmed)) return
    setCategories(prev => [...prev, trimmed])
    setNewCategory('')
  }

  const handleRemoveCategory = (cat: string) => {
    setCategories(prev => prev.filter(c => c !== cat))
  }

  // ─────────────────────────────────────────────
  // ELIMINAR EVENTO
  // ─────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true); setDeleteError('')
    const { error: errGuests } = await supabase.from('guests').delete().eq('event_id', id)
    if (errGuests) { setDeleteError('Error eliminando invitados: ' + errGuests.message); setDeleting(false); return }
    const { error: errMsgs } = await supabase.from('wa_messages').delete().eq('event_id', id)
    if (errMsgs) { setDeleteError('Error eliminando mensajes: ' + errMsgs.message); setDeleting(false); return }
    const { error: errEvent } = await supabase.from('events').delete().eq('id', id)
    if (errEvent) { setDeleteError('Error eliminando evento: ' + errEvent.message); setDeleting(false); return }
    router.push('/dashboard')
  }

  // ─────────────────────────────────────────────
  // PLANTILLAS
  // ─────────────────────────────────────────────
  const updateTemplate = (i: number, value: string) =>
    setTemplates(prev => prev.map((t, idx) => idx === i ? value : t))

  const updateTemplateName = (i: number, value: string) =>
    setTemplateNames(prev => prev.map((n, idx) => idx === i ? value : n))

  if (loading) return <div className="p-8 text-sm text-[#666]">Cargando...</div>

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* ══ MODAL: Confirmar eliminación del evento ══ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 className="mb-1 text-base font-bold text-[#1D1E20]">¿Eliminar este evento?</h3>
            <p className="mb-1 text-sm text-[#666]">
              Se eliminarán permanentemente <span className="font-semibold text-[#1D1E20]">{name}</span> y todos sus invitados y mensajes.
            </p>
            <p className="mb-5 text-xs text-[#999]">Esta acción no se puede deshacer.</p>
            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError('') }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-[#e0e0e0] py-2.5 text-sm font-medium text-[#666] transition hover:bg-[#f5f5f5] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ HEADER STICKY ══ */}
      <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Configuración</h1>
            <p className="mt-0.5 text-xs text-[#666] sm:text-sm">Datos generales y plantillas de WhatsApp</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition sm:px-5 sm:py-2.5
              ${saved
                ? 'border border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]'
                : saving
                  ? 'bg-[#a0e0d8] text-white'
                  : 'bg-[#48C9B0] text-white hover:bg-[#3ab89f]'
              } disabled:cursor-not-allowed`}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] px-3 py-2.5 text-xs text-[#cc3333]">
            {error}
          </div>
        )}
      </div>

      {/* ══ CONTENIDO SCROLLEABLE ══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">

            {/* ── COLUMNA IZQUIERDA: Datos del evento + Tags ── */}
            <div className="flex flex-col gap-4 sm:gap-5">

              {/* Datos generales del evento */}
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-[#1D1E20] sm:text-lg">
                  📋 Datos del evento
                </h2>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Nombre *</label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Boda Ana & Carlos"
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Tipo de evento</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EVENT_TYPES.map(type => (
                        <button
                          key={type.value}
                          onClick={() => setEventType(type.value)}
                          className={`rounded-lg border px-2.5 py-2 text-left text-xs transition
                            ${eventType === type.value
                              ? 'border-[#48C9B0] bg-[#f0fdfb] font-semibold text-[#1a9e88]'
                              : 'border-[#e0e0e0] bg-white text-[#444] hover:border-[#48C9B0] hover:text-[#1a9e88]'
                            }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#555]">Fecha</label>
                      <input
                        type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ colorScheme: 'light' }}
                        className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#555]">Hora</label>
                      <input
                        type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
                        style={{ colorScheme: 'light' }}
                        className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Venue</label>
                    <input
                      type="text" value={venue} onChange={e => setVenue(e.target.value)}
                      placeholder="Hacienda San Miguel"
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Dirección exacta</label>
                    <input
                      type="text" value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Carr. Saltillo-Monterrey Km 4.5"
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>
                </div>
              </div>

              {/* Tags de invitados
                  El planner define aquí los tags disponibles para este evento.
                  Los tags se asignan individualmente a cada invitado desde la lista. */}
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-1.5 text-base font-semibold text-[#1D1E20] sm:text-lg">
                  🏷️ Tags para invitados
                </h2>
                <p className="mb-3 text-xs text-[#666]">
                  Define las etiquetas que podrás asignar a tus invitados. Ej: VIP, Mesa 1, Vegetariano, Mala copa...
                </p>

                {/* Tags existentes como chips de colores */}
                {guestTags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {guestTags.map((tag, i) => {
                      const col = getTagColor(i)
                      return (
                        <span
                          key={tag}
                          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{ background: col.bg, borderColor: col.border, color: col.text }}
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-60 transition hover:opacity-100"
                            style={{ color: col.text }}
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Input para agregar nuevo tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    placeholder="Nuevo tag..."
                    className="flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="shrink-0 rounded-lg bg-[#48C9B0] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </div>
              </div>

            </div>

            {/* ── COLUMNA DERECHA: Plantillas + Playlist ── */}
            <div className="flex flex-col gap-4 sm:gap-5">

              {/* Plantillas de WhatsApp */}
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-1.5 text-base font-semibold text-[#1D1E20] sm:text-lg">
                  💬 Plantillas de WhatsApp
                </h2>
                <p className="mb-4 text-xs text-[#666]">
                  Doble click en el nombre para renombrarlo. Usa los chips para insertar variables.
                </p>
                <div className="flex flex-col gap-5">
                  {templates.slice(0, visibleTemplates).map((template, i) => (
                    <TemplateInput
                      key={i}
                      index={i}
                      value={template}
                      name={templateNames[i] || DEFAULT_NAMES[i]}
                      onChange={val => updateTemplate(i, val)}
                      onNameChange={val => updateTemplateName(i, val)}
                      placeholder={i === 0
                        ? 'Hola {nombre}, te esperamos en {evento} el {fecha} a las {hora} 🎉'
                        : 'Escribe aquí tu mensaje...'}
                    />
                  ))}
                  {visibleTemplates < 10 && (
                    <button
                      onClick={() => setVisibleTemplates(v => Math.min(v + 1, 10))}
                      className="flex items-center gap-1.5 text-xs text-[#48C9B0] transition hover:text-[#3ab89f]"
                    >
                      <span className="text-base leading-none">+</span> Agregar plantilla
                    </button>
                  )}
                </div>
              </div>

              {/* Playlist de invitados */}
              <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
                <h2 className="mb-1.5 text-base font-semibold text-[#1D1E20] sm:text-lg">
                  🎵 Playlist de invitados
                </h2>
                <p className="mb-4 text-xs text-[#666]">
                  Los invitados recomiendan canciones desde un link público sin necesidad de crear cuenta.
                </p>

                {/* Categorías de la playlist */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Categorías</label>
                  <p className="mb-2 text-xs text-[#999]">Ej: Vals, Entrada, Para llorar, Techno...</p>
                  {categories.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {categories.map(cat => (
                        <span key={cat} className="flex items-center gap-1 rounded-full border border-[#d0d0d0] bg-white px-2.5 py-1 text-xs text-[#555]">
                          {cat}
                          <button
                            onClick={() => handleRemoveCategory(cat)}
                            className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#999] hover:bg-red-100 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text" value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                      placeholder="Nueva categoría..."
                      className="flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className="shrink-0 rounded-lg bg-[#48C9B0] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-40"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Link público de la playlist */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Link público</label>
                  {playlistToken ? (
                    <div className="flex gap-2">
                      <div className="flex-1 overflow-hidden rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5">
                        <p className="truncate font-mono text-xs text-[#555]">
                          {typeof window !== 'undefined' ? window.location.origin : 'https://guestflow-eta.vercel.app'}/playlist/{playlistToken}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition
                          ${copied
                            ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]'
                            : 'border-[#d0d0d0] bg-white text-[#555] hover:border-[#48C9B0] hover:text-[#1a9e88]'
                          }`}
                      >
                        {copied ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateToken}
                      className="w-full rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] py-2.5 text-xs font-medium text-[#1a9e88] transition hover:bg-[#e0faf5]"
                    >
                      + Generar link de playlist
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ══ ZONA DE PELIGRO ══ */}
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 sm:p-5">
            <h2 className="mb-1 text-sm font-semibold text-red-700">Zona de peligro</h2>
            <p className="mb-4 text-xs text-red-500">
              Una vez que elimines este evento, se borrarán todos sus invitados y mensajes. Esta acción no se puede deshacer.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
            >
              Eliminar evento
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}