'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimePickerProps {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

function formatDisplay(val: string): string {
  if (!val) return ''
  const [h, m] = val.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const HOURS = ['01','02','03','04','05','06','07','08','09','10','11','12']
const MINUTES = ['00','15','30','45']

export default function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const parseValue = () => {
    if (!value) return { hour: '', minute: '', period: 'pm' }
    const [h, m] = value.split(':').map(Number)
    const period = h >= 12 ? 'pm' : 'am'
    const hour12 = h % 12 || 12
    return { hour: String(hour12).padStart(2, '0'), minute: String(m).padStart(2, '0'), period }
  }

  const { hour, minute, period } = parseValue()

  const buildValue = (h: string, m: string, p: string) => {
    let h24 = parseInt(h)
    if (p === 'pm' && h24 !== 12) h24 += 12
    if (p === 'am' && h24 === 12) h24 = 0
    return `${String(h24).padStart(2, '0')}:${m}`
  }

  const setHour   = (h: string) => onChange(buildValue(h, minute || '00', period))
  const setMinute = (m: string) => onChange(buildValue(hour || '12', m, period))
  const setPeriod = (p: string) => onChange(buildValue(hour || '12', minute || '00', p))

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        <Clock size={15} className={value ? 'text-[#48C9B0]' : 'text-[#bbb]'} />
        <span className={`flex-1 ${!value ? 'text-[#c0c0c0]' : 'text-[#1D1E20]'}`}>
          {value ? formatDisplay(value) : 'Seleccionar hora'}
        </span>
        {value && !disabled && (
          <span onClick={handleClear} className="cursor-pointer text-[#ccc] transition hover:text-[#888]">×</span>
        )}
      </button>

      {/* Dropdown compacto */}
      {open && (
        <div className="absolute left-0 bottom-full z-50 mb-1.5 w-72 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">

          {/* Horas — grid 6x2 */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#bbb]">Hora</p>
          <div className="mb-3 grid grid-cols-6 gap-1">
            {HOURS.map(h => (
              <button
                key={h}
                onClick={() => setHour(h)}
                className={`rounded-lg py-1.5 text-center text-sm font-medium transition
                  ${hour === h
                    ? 'bg-[#48C9B0] text-white'
                    : 'text-[#555] hover:bg-[#f0fdfb] hover:text-[#1a9e88]'
                  }`}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Minutos — fila */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#bbb]">Minutos</p>
          <div className="mb-3 grid grid-cols-4 gap-1">
            {MINUTES.map(m => (
              <button
                key={m}
                onClick={() => setMinute(m)}
                className={`rounded-lg py-1.5 text-center text-sm font-medium transition
                  ${minute === m
                    ? 'bg-[#48C9B0] text-white'
                    : 'text-[#555] hover:bg-[#f0fdfb] hover:text-[#1a9e88]'
                  }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* AM / PM toggle */}
          <div className="flex overflow-hidden rounded-lg border border-[#e0e0e0]">
            {['am', 'pm'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2 text-sm font-semibold uppercase transition
                  ${period === p
                    ? 'bg-[#48C9B0] text-white'
                    : 'bg-white text-[#888] hover:bg-[#f0fdfb] hover:text-[#1a9e88]'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Preview */}
          {value && (
            <p className="mt-3 text-center text-xs font-semibold text-[#48C9B0]">
              {formatDisplay(value)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}