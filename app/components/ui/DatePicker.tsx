'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { CalendarDays, X } from 'lucide-react'
import 'react-day-picker/style.css'

interface DatePickerProps {
  value: string        // formato 'YYYY-MM-DD'
  onChange: (v: string) => void
  placeholder?: string
  minDate?: string     // formato 'YYYY-MM-DD'
  disabled?: boolean
}

function parseLocal(str: string): Date | undefined {
  if (!str) return undefined
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(str: string): string {
  if (!str) return ''
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', minDate, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = parseLocal(value)
  const fromDate = minDate ? parseLocal(minDate) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onChange(toYMD(date))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(p => !p)}
        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition
          ${disabled
            ? 'cursor-not-allowed border-[#f0f0f0] bg-[#f8f8f8] text-[#ccc]'
            : open
              ? 'border-[#48C9B0] bg-white ring-2 ring-[#48C9B0]/20'
              : 'border-[#d0d0d0] bg-white text-[#1D1E20] hover:border-[#48C9B0]'
          }`}
      >
        <CalendarDays size={15} className={value ? 'text-[#48C9B0]' : 'text-[#bbb]'} />
        <span className={`flex-1 ${!value ? 'text-[#c0c0c0]' : 'text-[#1D1E20]'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span onClick={handleClear} className="text-[#ccc] transition hover:text-[#888]">
            <X size={13} />
          </span>
        )}
      </button>

      {/* Calendario */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={es}
            disabled={fromDate ? { before: fromDate } : undefined}
            defaultMonth={selected || fromDate || new Date()}
            style={{
              '--rdp-accent-color': '#48C9B0',
              '--rdp-accent-background-color': '#f0fdfb',
            } as React.CSSProperties}
            classNames={{
              root:        'p-3',
              month:       'w-full',
              month_caption: 'flex items-center justify-between px-1 pb-3',
              caption_label: 'text-sm font-semibold text-[#1D1E20] capitalize',
              nav:         'flex items-center gap-1',
              button_previous: 'flex h-7 w-7 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0]',
              button_next:     'flex h-7 w-7 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888] transition hover:border-[#48C9B0] hover:text-[#48C9B0]',
              weeks:       'w-full',
              weekdays:    'flex mb-1',
              weekday:     'flex-1 text-center text-[11px] font-medium text-[#bbb] uppercase pb-1',
              week:        'flex',
              day:         'flex-1 flex items-center justify-center p-0.5',
              day_button:  'h-8 w-8 rounded-lg text-sm text-[#1D1E20] transition hover:bg-[#f0fdfb] hover:text-[#1a9e88] cursor-pointer',
              selected:    'bg-[#48C9B0] text-white rounded-lg hover:bg-[#3ab89f]',
              today:       'font-bold text-[#48C9B0]',
              outside:     'text-[#ddd]',
              disabled:    'text-[#e0e0e0] cursor-not-allowed',
              hidden:      'invisible',
            }}
          />
        </div>
      )}
    </div>
  )
}