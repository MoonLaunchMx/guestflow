'use client'

import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'

// Hook que maneja estado + persistencia en localStorage por evento + storageKey.
// Lo expone para que la página decida dónde colocar el botón y dónde el wrapper.
export function useStatsToggle(eventId: string, storageKey: string) {
  const [visible, setVisible] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const fullKey = `anfiora_stats_${eventId}_${storageKey}`

  // Leer preferencia guardada al montar (solo cliente)
  useEffect(() => {
    const stored = window.localStorage.getItem(fullKey)
    if (stored !== null) setVisible(stored === 'true')
    setHydrated(true)
  }, [fullKey])

  // Persistir cambios solo después de hidratar para no escribir el default
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(fullKey, String(visible))
  }, [visible, hydrated, fullKey])

  return { visible, toggle: () => setVisible((v) => !v) }
}

// Toggle estilo switch (iOS-like). Apagado = gris, prendido = teal.
// Recibe el estado visible y el callback — no maneja localStorage internamente.
export function StatsToggleButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={visible}
      aria-label={visible ? 'Ocultar estadísticas' : 'Mostrar estadísticas'}
      className="flex items-center gap-2 py-1"
    >
      <BarChart3 size={14} className={visible ? 'text-[#48C9B0]' : 'text-gray-400'} />
      <span
        className={
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ' +
          (visible ? 'bg-[#48C9B0]' : 'bg-gray-300')
        }
      >
        <span
          className={
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ' +
            (visible ? 'translate-x-[18px]' : 'translate-x-0.5')
          }
        />
      </span>
    </button>
  )
}

// Wrapper que colapsa el contenido en mobile.
// En desktop siempre se muestra. Recibe visible como prop (controlado por el hook arriba).
export default function StatsCollapse({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: render directo, siempre visible */}
      <div className="hidden lg:block">{children}</div>

      {/* Mobile: animación de altura con grid-template-rows (CSS puro) */}
      <div
        className="lg:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
        style={{
          gridTemplateRows: visible ? '1fr' : '0fr',
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </>
  )
}