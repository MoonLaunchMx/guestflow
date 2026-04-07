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

  const cardStyle = {
    background: '#fafafa',
    border: '1px solid #e8e8e8',
    borderRadius: '12px',
    padding: '20px',
  }

  const numberStyle = {
    width: '28px', height: '28px',
    background: '#48C9B0', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '12px',
  }

  const titleStyle = {
    fontSize: '14px', fontWeight: '600',
    color: '#1D1E20', margin: '0 0 6px 0',
  }

  const descStyle = {
    fontSize: '12px', color: '#888',
    margin: '0', lineHeight: '1.5',
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff' }}>
      <div style={{ padding: '28px 40px 60px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', color: '#1D1E20' }}>Álbum de fotos</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Sigue estos 3 pasos para compartir el álbum con tus invitados
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>

{/* Paso 1 */}
          <div style={cardStyle}>
            <div style={numberStyle}>1</div>
            <h2 style={titleStyle}>Crea tu álbum compartido</h2>
            <p style={descStyle}>
              Elige una app para crear tu álbum y activa la opción de colaboración para que tus invitados puedan subir fotos.
            </p>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1D1E20' }}>📸 Google Photos</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Gratis · Android e iPhone</div>
                </div>
                <button
                  onClick={() => window.open('https://www.youtube.com/results?search_query=como+crear+album+compartido+google+photos', '_blank')}
                  style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #48C9B0', borderRadius: '6px', color: '#1a9e88', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Tutorial
                </button>
              </div>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1D1E20' }}>🍎 iCloud</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Gratis · Solo iPhone</div>
                </div>
                <button
                  onClick={() => window.open('https://www.youtube.com/results?search_query=como+crear+album+compartido+icloud+fotos', '_blank')}
                  style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #48C9B0', borderRadius: '6px', color: '#1a9e88', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Tutorial
                </button>
              </div>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1D1E20' }}>📦 Dropbox</div>
                  <div style={{ fontSize: '11px', color: '#b8860b' }}>Implica costo · Android e iPhone</div>
                </div>
                <button
                  onClick={() => window.open('https://www.youtube.com/results?search_query=como+crear+carpeta+compartida+dropbox', '_blank')}
                  style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #48C9B0', borderRadius: '6px', color: '#1a9e88', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Tutorial
                </button>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div style={cardStyle}>
            <div style={numberStyle}>2</div>
            <h2 style={titleStyle}>Pega el link aquí</h2>
            <p style={descStyle}>
              Copia el link del álbum compartido y pégalo abajo. Funciona con Google Photos, iCloud, Dropbox y OneDrive.
            </p>
            <div style={{ marginTop: '12px' }}>
              <textarea
                value={albumUrl}
                onChange={e => setAlbumUrl(e.target.value)}
                placeholder="https://photos.google.com/share/..."
                rows={2}
                style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#1D1E20', fontSize: '13px', outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: '1.5' }}
              />
              <button onClick={handleSave} disabled={saving}
                style={{ marginTop: '8px', width: '100%', padding: '10px', background: saved ? '#f0fdfb' : saving ? '#a0e0d8' : '#48C9B0', border: saved ? '1px solid #48C9B0' : 'none', borderRadius: '8px', color: saved ? '#1a9e88' : '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saved ? '✓ Link guardado' : saving ? 'Guardando...' : 'Guardar link'}
              </button>
            </div>
          </div>

          {/* Paso 3 */}
          <div style={cardStyle}>
            <div style={numberStyle}>3</div>
            <h2 style={titleStyle}>Comparte el QR</h2>
            <p style={descStyle}>
              {albumUrl
                ? 'Tu QR está listo. Descárgalo e imprímelo o compártelo por WhatsApp.'
                : 'El QR aparecerá aquí una vez que guardes el link.'}
            </p>
            {albumUrl ? (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px' }}>
                  <QRCodeCanvas value={albumUrl} size={140} />
                </div>
                <button onClick={downloadQR}
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #48C9B0', borderRadius: '8px', color: '#1a9e88', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  ⬇️ Descargar QR
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '12px', textAlign: 'center', padding: '24px', border: '1px dashed #e0e0e0', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>📱</div>
                <div style={{ fontSize: '12px', color: '#bbb' }}>Primero guarda el link</div>
              </div>
            )}
          </div>

{/* Paso 4 */}
          <div style={cardStyle}>
            <div style={numberStyle}>4</div>
            <h2 style={titleStyle}>Diseña e imprime tu QR</h2>
            <p style={descStyle}>
              Descarga el QR y personalízalo en Canva para que combine con la decoración de tu evento. Después imprímelo y colócalo en mesas, entrada o invitaciones.
            </p>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1D1E20' }}>🎨 Canva</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Gratis · Muy fácil de usar</div>
                </div>
                <button
                  onClick={() => window.open('https://www.canva.com', '_blank')}
                  style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #48C9B0', borderRadius: '6px', color: '#1a9e88', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Abrir
                </button>
              </div>
            </div>
            <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f0fdfb', border: '1px solid #a0e0d8', borderRadius: '8px', fontSize: '11px', color: '#1a9e88', lineHeight: '1.5' }}>
              💡 Tip: En Canva busca "QR code" en plantillas para encontrar diseños listos para bodas y eventos.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}