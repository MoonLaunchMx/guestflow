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
  const [name, setName]           = useState('')
  const [date, setDate]           = useState('')
  const [venue, setVenue]         = useState('')
  const [eventType, setEventType] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

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

  return (
    <div className="min-h-screen bg-white font-sans text-[#1D1E20]">

      {/* ── Header ── */}
      <header className="border-b border-[#e8e8e8] bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:h-16 sm:px-6">
          <span className="text-lg font-bold sm:text-xl" style={{ fontFamily: 'Georgia, serif' }}>
            Guest<span className="text-[#48C9B0]">Flow</span>
          </span>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="rounded-md border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#888] transition hover:bg-[#f5f5f5] sm:px-4 sm:text-sm"
          >
            ← Volver
          </button>
        </div>
      </header>

      {/* ── Contenido ── */}
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-10">

        <h1 className="text-xl font-bold text-[#1D1E20] sm:text-2xl">Nuevo evento</h1>
        <p className="mt-1 text-sm text-[#888]">Ingresa los datos básicos del evento</p>

        <div className="mt-6 flex flex-col gap-5 sm:mt-8">

          {/* Tipo de evento */}
          <div>
            <label className="mb-2.5 block text-xs font-semibold text-[#555] sm:text-sm">
              Tipo de evento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setEventType(type.value)}
                  className={`rounded-lg border px-3 py-3 text-left text-xs transition sm:text-sm
                    ${eventType === type.value
                      ? 'border-[#48C9B0] bg-[#f0fdfb] font-semibold text-[#1a9e88]'
                      : 'border-[#e0e0e0] bg-[#f8f8f8] text-[#555] hover:border-[#48C9B0] hover:text-[#1a9e88]'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#555] sm:text-sm">
              Nombre del evento *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Boda Ana & Carlos"
              className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0] sm:text-base"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#555] sm:text-sm">
              Fecha del evento *
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ colorScheme: 'light' }}
              className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0] sm:text-base"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#555] sm:text-sm">
              Venue <span className="font-normal text-[#ccc]">(opcional)</span>
            </label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="Hacienda San Miguel"
              className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0] sm:text-base"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-[#ffc0c0] bg-[#fff0f0] p-3 text-xs text-[#cc3333] sm:text-sm">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="mt-6 flex gap-3 sm:mt-8">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 rounded-lg border border-[#e0e0e0] py-3.5 text-sm text-[#888] transition hover:bg-[#f5f5f5]"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-[2] rounded-lg bg-[#48C9B0] py-3.5 text-sm font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-60"
          >
            {loading ? 'Creando...' : 'Crear evento'}
          </button>
        </div>
      </main>
    </div>
  )
}