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
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [error, setError]                   = useState('')
  const [name, setName]                     = useState('')
  const [eventType, setEventType]           = useState('')
  const [eventDate, setEventDate]           = useState('')
  const [eventTime, setEventTime]           = useState('')
  const [venue, setVenue]                   = useState('')
  const [address, setAddress]               = useState('')
  const [templates, setTemplates]           = useState<string[]>(['', '', '', '', ''])
  const [visibleTemplates, setVisibleTemplates] = useState(2)

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
        const loaded = [...data.message_templates, '', '', '', '', ''].slice(0, 5)
        setTemplates(loaded)
        const filled = loaded.filter(t => t.trim()).length
        setVisibleTemplates(Math.max(2, filled))
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

  if (loading) return <div className="p-8 text-sm text-[#666]">Cargando...</div>

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* ── Header sticky ── */}
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

      {/* ── Contenido scrolleable ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">

          {/* Grid: 1 col mobile, 2 col desktop */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">

            {/* ── Datos del evento ── */}
            <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-[#1D1E20] sm:text-lg">
                📋 Datos del evento
              </h2>

              <div className="flex flex-col gap-3 sm:gap-4">

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Nombre *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
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
                      type="date"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      style={{ colorScheme: 'light' }}
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">Hora</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={e => setEventTime(e.target.value)}
                      style={{ colorScheme: 'light' }}
                      className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Venue</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    placeholder="Hacienda San Miguel"
                    className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#555]">Dirección exacta</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Carr. Saltillo-Monterrey Km 4.5"
                    className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                  />
                </div>

              </div>
            </div>

            {/* ── Plantillas WhatsApp ── */}
            <div className="rounded-xl bg-[#fafafa] p-4 sm:p-5">
              <h2 className="mb-1.5 text-base font-semibold text-[#1D1E20] sm:text-lg">
                💬 Plantillas de WhatsApp
              </h2>
              <p className="mb-3 text-xs text-[#666]">Mensajes pre-escritos para enviar a tus invitados</p>

              <div className="mb-4 rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 font-mono text-[11px] text-[#999]">
                {'{nombre} · {evento} · {fecha} · {hora} · {venue}'}
              </div>

              <div className="flex flex-col gap-3">
                {templates.slice(0, visibleTemplates).map((template, i) => (
                  <div key={i}>
                    <label className="mb-1.5 block text-xs font-medium text-[#555]">
                      Plantilla {i + 1}
                    </label>
                    <textarea
                      value={template}
                      onChange={e => updateTemplate(i, e.target.value)}
                      placeholder={i === 0
                        ? 'Hola {nombre}, te esperamos en {evento} el {fecha} a las {hora} 🎉'
                        : `Plantilla ${i + 1}...`}
                      rows={4}
                      className="w-full resize-y rounded-lg border border-[#d0d0d0] bg-white px-3 py-2.5 font-sans text-sm leading-relaxed text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                    />
                  </div>
                ))}

                {visibleTemplates < 5 && (
                  <button
                    onClick={() => setVisibleTemplates(v => Math.min(v + 1, 5))}
                    className="flex items-center gap-1.5 text-xs text-[#48C9B0] transition hover:text-[#3ab89f]"
                  >
                    <span className="text-base leading-none">+</span> Agregar plantilla
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}