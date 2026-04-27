'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Song {
  id: string
  guest_name: string
  song_title: string
  artist: string
  spotify_url: string | null
  category: string | null
  created_at: string
  position: number
  notes: string | null
}

function detectPlatform(url: string): 'spotify' | 'youtube' | 'apple' | 'unknown' {
  if (url.includes('spotify.com')) return 'spotify'
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) return 'youtube'
  if (url.includes('music.apple.com')) return 'apple'
  return 'unknown'
}

const PLATFORM_CONFIG = {
  spotify: { label: 'Spotify',     color: 'border-[#1DB954] text-[#1DB954] hover:bg-[#f0fdf4]' },
  youtube: { label: 'YouTube',     color: 'border-[#FF0000] text-[#FF0000] hover:bg-[#fff5f5]' },
  apple:   { label: 'Apple Music', color: 'border-[#fc3c44] text-[#fc3c44] hover:bg-[#fff5f5]' },
  unknown: { label: 'Link',        color: 'border-[#d0d0d0] text-[#888]   hover:bg-[#fafafa]'  },
}

export default function PlaylistPlannerPage() {
  const { id } = useParams()
  const [allSongs, setAllSongs]           = useState<Song[]>([])
  const [categories, setCategories]       = useState<string[]>([])
  const [playlistToken, setPlaylistToken] = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [filterCat, setFilterCat]         = useState('todas')
  const [filterPlat, setFilterPlat]       = useState('todas')
  const [search, setSearch]               = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue]         = useState('')
  const [newCat, setNewCat]               = useState('')
  const [addingCat, setAddingCat]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const [mobileTab, setMobileTab]         = useState<'playlist' | 'config'>('playlist')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: eventData }, { data: settingsData }, { data: songsData }] = await Promise.all([
      supabase.from('events').select('name').eq('id', id).single(),
      supabase.from('event_settings').select('playlist_categories, playlist_token').eq('event_id', id).single(),
      supabase.from('song_recommendations').select('*').eq('event_id', id).order('position', { ascending: true }),
    ])
    if (settingsData) {
      setCategories(Array.isArray(settingsData.playlist_categories) ? settingsData.playlist_categories : [])
      setPlaylistToken(settingsData.playlist_token || null)
    }
    setAllSongs(songsData || [])
    setLoading(false)
  }

  const playlistUrl = playlistToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/playlist/${playlistToken}`
    : null

  const copyLink = async () => {
    if (!playlistUrl) return
    await navigator.clipboard.writeText(playlistUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addCategory = async () => {
    const trimmed = newCat.trim()
    if (!trimmed || categories.includes(trimmed)) return
    const updated = [...categories, trimmed]
    await supabase.from('event_settings').update({ playlist_categories: updated }).eq('event_id', id)
    setCategories(updated)
    setNewCat('')
    setAddingCat(false)
  }

  const removeCategory = async (cat: string) => {
    const updated = categories.filter(c => c !== cat)
    await supabase.from('event_settings').update({ playlist_categories: updated }).eq('event_id', id)
    setCategories(updated)
  }

  const moveUp = async (index: number) => {
    if (index === 0) return
    const updated = [...allSongs]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    const reindexed = updated.map((s, i) => ({ ...s, position: i }))
    setAllSongs(reindexed)
    await persistOrder(reindexed)
  }

  const moveDown = async (index: number) => {
    if (index === allSongs.length - 1) return
    const updated = [...allSongs]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    const reindexed = updated.map((s, i) => ({ ...s, position: i }))
    setAllSongs(reindexed)
    await persistOrder(reindexed)
  }

  const persistOrder = async (ordered: Song[]) => {
    setSaving(true)
    await Promise.all(ordered.map(s =>
      supabase.from('song_recommendations').update({ position: s.position }).eq('id', s.id)
    ))
    setSaving(false)
  }

  const openNote = (song: Song) => {
    setEditingNoteId(song.id)
    setNoteValue(song.notes || '')
  }

  const saveNote = async (songId: string) => {
    await supabase.from('song_recommendations').update({ notes: noteValue || null }).eq('id', songId)
    setAllSongs(prev => prev.map(s => s.id === songId ? { ...s, notes: noteValue || null } : s))
    setEditingNoteId(null)
  }

  const totalSongs   = allSongs.length
  const uniqueGuests = new Set(allSongs.map(s => s.guest_name)).size

  const filtered = allSongs.filter(s => {
    const matchCat    = filterCat  === 'todas' || s.category === filterCat
    const matchPlat   = filterPlat === 'todas' || (s.spotify_url && detectPlatform(s.spotify_url) === filterPlat)
    const matchSearch = search === '' ||
      s.song_title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      s.guest_name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchPlat && matchSearch
  })

  if (loading) return <div className="p-8 text-sm text-[#666]">Cargando playlist...</div>

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  const KpiCards = () => (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-wide text-[#999]">Canciones</p>
        <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">{totalSongs}</p>
      </div>
      <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-wide text-[#999]">Participaron</p>
        <p className="mt-1 text-2xl font-semibold text-[#48C9B0]">{uniqueGuests}</p>
        <p className="text-[10px] text-[#999]">invitados</p>
      </div>
      <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-wide text-[#999]">Categorías</p>
        <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">{categories.length}</p>
      </div>
      {/* 4ta card solo desktop */}
      <div className="hidden rounded-xl border border-[#e8e8e8] bg-white px-4 py-3 sm:block">
        <p className="text-[10px] uppercase tracking-wide text-[#999]">Sin categoría</p>
        <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">
          {allSongs.filter(s => !s.category).length}
        </p>
      </div>
    </div>
  )

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Búsqueda */}
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar canción, artista o persona..."
        className="min-w-[160px] flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-1.5 text-xs text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
      />
      {/* Filtro categoría */}
      {categories.length > 0 && (
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="rounded-lg border border-[#d0d0d0] bg-white px-2.5 py-1.5 text-xs text-[#555] outline-none transition focus:border-[#48C9B0]"
        >
          <option value="todas">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="">Sin categoría</option>
        </select>
      )}
      {/* Filtro plataforma */}
      <select value={filterPlat} onChange={e => setFilterPlat(e.target.value)}
        className="rounded-lg border border-[#d0d0d0] bg-white px-2.5 py-1.5 text-xs text-[#555] outline-none transition focus:border-[#48C9B0]"
      >
        <option value="todas">Todas las plataformas</option>
        <option value="spotify">Spotify</option>
        <option value="youtube">YouTube</option>
        <option value="apple">Apple Music</option>
      </select>

      {/* Separador — solo desktop */}
      <div className="hidden h-5 w-px bg-[#e8e8e8] sm:block" />

      {/* Categorías chips — solo desktop */}
      <div className="hidden items-center gap-1.5 sm:flex flex-wrap">
        {categories.map(cat => (
          <span key={cat} className="flex items-center gap-1 rounded-full bg-[#E1F5EE] px-2.5 py-1 text-xs font-medium text-[#0F6E56]">
            {cat}
            <button onClick={() => removeCategory(cat)} className="ml-0.5 text-[#48C9B0] hover:text-[#0F6E56]">×</button>
          </span>
        ))}
        {addingCat ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCat(false) }}
              placeholder="Nueva categoría..."
              className="w-32 rounded-lg border border-[#48C9B0] px-2 py-1 text-xs outline-none"
            />
            <button onClick={addCategory} className="rounded-lg bg-[#48C9B0] px-2 py-1 text-xs text-white">✓</button>
            <button onClick={() => setAddingCat(false)} className="rounded-lg border border-[#e0e0e0] px-2 py-1 text-xs text-[#aaa]">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="rounded-full border border-dashed border-[#ccc] px-2.5 py-1 text-xs text-[#aaa] transition hover:border-[#48C9B0] hover:text-[#48C9B0]"
          >
            + Categoría
          </button>
        )}
      </div>

      {/* Link copiar — solo desktop */}
      {playlistUrl && (
        <div className="hidden items-center gap-2 sm:flex">
          <div className="hidden h-5 w-px bg-[#e8e8e8] sm:block" />
          <span className="max-w-[160px] truncate rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-2.5 py-1.5 text-xs text-[#0F6E56]">
            {playlistUrl}
          </span>
          <button
            onClick={copyLink}
            className="rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3ab89f]"
          >
            {copied ? '¡Copiado!' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  )

  // ── Song rows ──────────────────────────────────────────────────────────────
  const SongRows = ({ songs }: { songs: Song[] }) => (
    <div className="flex flex-col gap-2">
      {songs.map(song => {
        const globalIndex = allSongs.findIndex(s => s.id === song.id)
        const platform = song.spotify_url ? detectPlatform(song.spotify_url) : 'unknown'
        const platformConfig = PLATFORM_CONFIG[platform]
        const isFirst = globalIndex === 0
        const isLast  = globalIndex === allSongs.length - 1
        const isEditingNote = editingNoteId === song.id

        return (
          <div key={song.id} className="rounded-xl border border-[#e8e8e8] bg-white">
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="flex shrink-0 flex-col gap-0.5">
                <button onClick={() => moveUp(globalIndex)} className={`flex h-5 w-5 items-center justify-center rounded text-[#ccc] transition hover:bg-[#f0f0f0] hover:text-[#888] ${isFirst ? 'invisible' : ''}`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,2 9,8 1,8"/></svg>
                </button>
                <button onClick={() => moveDown(globalIndex)} className={`flex h-5 w-5 items-center justify-center rounded text-[#ccc] transition hover:bg-[#f0f0f0] hover:text-[#888] ${isLast ? 'invisible' : ''}`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,8 9,2 1,2"/></svg>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1D1E20]">{song.song_title}</p>
                <p className="truncate text-xs text-[#888]">
                  {song.artist}
                  <span className="mx-1.5 text-[#ddd]">·</span>
                  <span className="text-[#48C9B0]">{song.guest_name}</span>
                  {song.category && (
                    <>
                      <span className="mx-1.5 text-[#ddd]">·</span>
                      <span className="text-[#bbb]">{song.category}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => isEditingNote ? setEditingNoteId(null) : openNote(song)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${song.notes || isEditingNote ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]' : 'border-[#e0e0e0] text-[#bbb] hover:border-[#48C9B0] hover:text-[#1a9e88]'}`}
              >
                {song.notes ? 'Nota' : '+ Nota'}
              </button>
              {song.spotify_url && (
                <button
                  onClick={() => window.open(song.spotify_url!, '_blank')}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${platformConfig.color}`}
                >
                  {platformConfig.label}
                </button>
              )}
            </div>
            {isEditingNote && (
              <div className="border-t border-[#f0f0f0] px-3 pb-3 pt-2">
                <textarea
                  value={noteValue}
                  onChange={e => setNoteValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(song.id) } }}
                  placeholder="Ej: perfecta para abrir el vals..."
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-[#d0d0d0] bg-[#fafafa] px-3 py-2 text-xs text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[10px] text-[#bbb]">Enter para guardar · Shift+Enter nueva línea</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditingNoteId(null)} className="rounded-lg border border-[#e0e0e0] px-2.5 py-1 text-xs text-[#aaa] hover:bg-[#f5f5f5]">Cancelar</button>
                    <button onClick={() => saveNote(song.id)} className="rounded-lg bg-[#48C9B0] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#3ab89f]">Guardar</button>
                  </div>
                </div>
              </div>
            )}
            {song.notes && !isEditingNote && (
              <div onClick={() => openNote(song)} className="cursor-pointer border-t border-[#f0f0f0] px-3 pb-2.5 pt-2">
                <p className="text-xs text-[#888]">{song.notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // ── Data list ──────────────────────────────────────────────────────────────
  const DataList = () => (
    <>
      {totalSongs === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-base font-semibold text-[#1D1E20]">Sin recomendaciones aún</h2>
          <p className="mt-1 text-sm text-[#999]">Comparte el link con tus invitados.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#999]">Sin resultados para ese filtro.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map(cat => {
            const songs = filtered.filter(s => s.category === cat)
            if (songs.length === 0) return null
            return (
              <div key={cat}>
                <div className="mb-2 flex items-center gap-2 border-b border-[#e8e8e8] pb-1.5">
                  <span className="text-xs font-semibold text-[#555]">{cat}</span>
                  <span className="rounded-full bg-[#E1F5EE] px-1.5 py-0.5 text-[10px] font-medium text-[#0F6E56]">{songs.length}</span>
                </div>
                <SongRows songs={songs} />
              </div>
            )
          })}
          {(() => {
            const uncategorized = filtered.filter(s => !s.category)
            if (uncategorized.length === 0) return null
            return (
              <div>
                <div className="mb-2 flex items-center gap-2 border-b border-[#e8e8e8] pb-1.5">
                  <span className="text-xs font-semibold text-[#555]">Sin categoría</span>
                  <span className="rounded-full bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-medium text-[#888]">{uncategorized.length}</span>
                </div>
                <SongRows songs={uncategorized} />
              </div>
            )
          })()}
        </div>
      )}
    </>
  )

  // ── Config panel (solo mobile tab) ────────────────────────────────────────
  const MobileConfigPanel = () => (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#999]">Link para invitados</p>
        {playlistUrl ? (
          <>
            <div className="rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-3 py-2 text-xs text-[#0F6E56] truncate">
              {playlistUrl}
            </div>
            <button
              onClick={copyLink}
              className="mt-2 w-full rounded-lg bg-[#48C9B0] py-2 text-xs font-semibold text-white transition hover:bg-[#3ab89f]"
            >
              {copied ? '¡Copiado!' : 'Copiar link'}
            </button>
          </>
        ) : (
          <p className="text-xs text-[#bbb]">Genera un token en Configuración para obtener el link.</p>
        )}
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#999]">Categorías</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <span key={cat} className="flex items-center gap-1 rounded-full bg-[#E1F5EE] px-2.5 py-1 text-xs font-medium text-[#0F6E56]">
              {cat}
              <button onClick={() => removeCategory(cat)} className="ml-0.5 text-[#48C9B0] hover:text-[#0F6E56]">×</button>
            </span>
          ))}
          {addingCat ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCat(false) }}
                placeholder="Nueva categoría..."
                className="w-32 rounded-lg border border-[#48C9B0] px-2 py-1 text-xs outline-none"
              />
              <button onClick={addCategory} className="rounded-lg bg-[#48C9B0] px-2 py-1 text-xs text-white">✓</button>
              <button onClick={() => setAddingCat(false)} className="rounded-lg border border-[#e0e0e0] px-2 py-1 text-xs text-[#aaa]">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCat(true)}
              className="rounded-full border border-dashed border-[#ccc] px-2.5 py-1 text-xs text-[#aaa] transition hover:border-[#48C9B0] hover:text-[#48C9B0]"
            >
              + Agregar categoría
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa]">

      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <div className="flex h-full flex-col sm:hidden">

        {/* NIVEL 1: KPIs — siempre visibles, encima de los tabs */}
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-4 py-3">
          <h1 className="mb-3 text-base font-semibold text-[#1D1E20]">Playlist</h1>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-wide text-[#999]">Canciones</p>
              <p className="mt-0.5 text-xl font-semibold text-[#1D1E20]">{totalSongs}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-wide text-[#999]">Participaron</p>
              <p className="mt-0.5 text-xl font-semibold text-[#48C9B0]">{uniqueGuests}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-wide text-[#999]">Categorías</p>
              <p className="mt-0.5 text-xl font-semibold text-[#1D1E20]">{categories.length}</p>
            </div>
          </div>
        </div>

        {/* NIVEL 2: Tabs */}
        <div className="flex shrink-0 border-b border-[#e8e8e8] bg-white">
          <button
            onClick={() => setMobileTab('playlist')}
            className={`flex-1 py-2.5 text-xs font-medium transition ${mobileTab === 'playlist' ? 'border-b-2 border-[#48C9B0] text-[#48C9B0]' : 'text-[#999]'}`}
          >
            Playlist
          </button>
          <button
            onClick={() => setMobileTab('config')}
            className={`flex-1 py-2.5 text-xs font-medium transition ${mobileTab === 'config' ? 'border-b-2 border-[#48C9B0] text-[#48C9B0]' : 'text-[#999]'}`}
          >
            Config
          </button>
        </div>

        {/* NIVEL 3: Contenido del tab */}
        <div className="flex-1 overflow-y-auto p-4">
          {mobileTab === 'playlist' ? <DataList /> : <MobileConfigPanel />}
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────────────── */}
      <div className="hidden h-full flex-col sm:flex overflow-hidden">

        {/* NIVEL 1: KPI Cards — full width */}
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[#1D1E20]">Playlist</h1>
            {saving && <span className="text-xs text-[#aaa]">Guardando...</span>}
          </div>
          <KpiCards />
        </div>

        {/* NIVEL 2: Toolbar — full width */}
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-6 py-3">
          <Toolbar />
        </div>

        {/* NIVEL 3: Data list — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <DataList />
        </div>

      </div>
    </div>
  )
}