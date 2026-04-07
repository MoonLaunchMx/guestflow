'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

export default function AlbumPage() {
  const { id } = useParams()
  const [albumUrl, setAlbumUrl] = useState('')
  const [eventName, setEventName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('events').select('album_url, name').eq('id', id).single()
      if (data?.album_url) setAlbumUrl(data.album_url)
      if (data?.name) setEventName(data.name)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    await supabase.from('events').update({ album_url: albumUrl || null }).eq('id', id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const downloadQR = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventName} - QR Invitados.png`
    a.click()
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-10 lg:py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Álbum de fotos</h1>
          <p className="mt-0.5 text-xs text-[#888] sm:text-sm">
            Sigue estos pasos para compartir el álbum con tus invitados
          </p>
        </div>

        {/* Grid: 1 col mobile, 2 col tablet, 2 col desktop (paso 1+2 arriba, 3+4 abajo) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">

          {/* ── Paso 1 ── */}
          <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#48C9B0] text-xs font-bold text-white">1</div>
            <h2 className="mb-1.5 text-sm font-semibold text-[#1D1E20]">Crea tu álbum compartido</h2>
            <p className="mb-4 text-xs leading-relaxed text-[#888]">
              Elige una app, activa la colaboración para que tus invitados puedan subir fotos.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { icon: '📸', name: 'Google Photos', desc: 'Gratis · Android e iPhone', color: '#888', url: 'https://www.youtube.com/results?search_query=como+crear+album+compartido+google+photos' },
                { icon: '🍎', name: 'iCloud',         desc: 'Gratis · Solo iPhone',      color: '#888', url: 'https://www.youtube.com/results?search_query=como+crear+album+compartido+icloud+fotos' },
                { icon: '📦', name: 'Dropbox',        desc: 'Implica costo · Android e iPhone', color: '#b8860b', url: 'https://www.youtube.com/results?search_query=como+crear+carpeta+compartida+dropbox' },
              ].map(app => (
                <div key={app.name} className="flex items-center justify-between rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-[#1D1E20]">{app.icon} {app.name}</p>
                    <p className="text-[11px]" style={{ color: app.color }}>{app.desc}</p>
                  </div>
                  <button
                    onClick={() => window.open(app.url, '_blank')}
                    className="rounded-md border border-[#48C9B0] px-2.5 py-1 text-[11px] font-semibold text-[#1a9e88] transition hover:bg-[#f0fdfb]"
                  >
                    Tutorial
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Paso 2 ── */}
          <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#48C9B0] text-xs font-bold text-white">2</div>
            <h2 className="mb-1.5 text-sm font-semibold text-[#1D1E20]">Pega el link aquí</h2>
            <p className="mb-4 text-xs leading-relaxed text-[#888]">
              Copia el link del álbum compartido y pégalo abajo, una ves copiado asegurate de guardarlo. Funciona con Google Photos, iCloud, Dropbox y OneDrive.
            </p>
            <textarea
              value={albumUrl}
              onChange={e => setAlbumUrl(e.target.value)}
              placeholder="https://photos.google.com/share/..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5 text-xs leading-relaxed text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className={`mt-2 w-full rounded-lg py-2.5 text-sm font-semibold transition
                ${saved
                  ? 'border border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]'
                  : saving
                    ? 'bg-[#a0e0d8] text-white'
                    : 'bg-[#48C9B0] text-white hover:bg-[#3ab89f]'
                } disabled:cursor-not-allowed`}
            >
              {saved ? '✓ Link guardado' : saving ? 'Guardando...' : 'Guardar link'}
            </button>
          </div>

          {/* ── Paso 3 ── */}
          <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#48C9B0] text-xs font-bold text-white">3</div>
            <h2 className="mb-1.5 text-sm font-semibold text-[#1D1E20]">Comparte el QR</h2>
            <p className="mb-4 text-xs leading-relaxed text-[#888]">
              {albumUrl
                ? 'Tu QR está listo. Descárgalo e imprímelo o compártelo por WhatsApp.'
                : 'El QR aparecerá aquí una vez que guardes el link.'}
            </p>
            {albumUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
                  <QRCodeCanvas value={albumUrl} size={140} />
                </div>
                <button
                  onClick={downloadQR}
                  className="w-full rounded-lg border border-[#48C9B0] py-2.5 text-sm font-semibold text-[#1a9e88] transition hover:bg-[#f0fdfb]"
                >
                  ⬇️ Descargar QR
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#e0e0e0] py-8 text-center">
                <div className="mb-2 text-3xl">📱</div>
                <p className="text-xs text-[#bbb]">Primero guarda el link</p>
              </div>
            )}
          </div>

          {/* ── Paso 4 ── */}
          <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#48C9B0] text-xs font-bold text-white">4</div>
            <h2 className="mb-1.5 text-sm font-semibold text-[#1D1E20]">Diseña e imprime tu QR</h2>
            <p className="mb-4 text-xs leading-relaxed text-[#888]">
              Descarga el QR y personalízalo en Canva para que combine con la decoración. Imprímelo y colócalo en mesas, entrada o invitaciones.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-[#1D1E20]">🎨 Canva</p>
                <p className="text-[11px] text-[#888]">Gratis · Muy fácil de usar</p>
              </div>
              <button
                onClick={() => window.open('https://www.canva.com', '_blank')}
                className="rounded-md border border-[#48C9B0] px-2.5 py-1 text-[11px] font-semibold text-[#1a9e88] transition hover:bg-[#f0fdfb]"
              >
                Abrir
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-[#a0e0d8] bg-[#f0fdfb] px-3 py-2.5 text-[11px] leading-relaxed text-[#1a9e88]">
              💡 En Canva busca "QR code" en plantillas para encontrar diseños listos para bodas y eventos.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}