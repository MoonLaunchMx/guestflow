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

function generateToken(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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

// ── Fuera del componente principal ─────────────────────────────────────────
function SongCard({
  song,
  isFirst,
  isLast,
  isEditingNote,
  onMoveUp,
  onMoveDown,
  onOpenNote,
  onCloseNote,
  onSaveNote,
}: {
  song: Song
  isFirst: boolean
  isLast: boolean
  isEditingNote: boolean
  onMoveUp: () => Promise<void>
  onMoveDown: () => Promise<void>
  onOpenNote: () => void
  onCloseNote: () => void
  onSaveNote: (note: string) => Promise<void>
}) {
  const [localNote, setLocalNote] = useState(song.notes || '')
  const platform = song.spotify_url ? detectPlatform(song.spotify_url) : 'unknown'
  const platformConfig = PLATFORM_CONFIG[platform]

  useEffect(() => {
    if (isEditingNote) setLocalNote(song.notes || '')
  }, [isEditingNote])

  return (
    <div className="rounded-xl border border-[#e8e8e8] bg-white">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex shrink-0 flex-col gap-0.5">
          <button onClick={onMoveUp} className={`flex h-5 w-5 items-center justify-center rounded text-[#ccc] transition hover:bg-[#f0f0f0] hover:text-[#888] ${isFirst ? 'invisible' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,2 9,8 1,8"/></svg>
          </button>
          <button onClick={onMoveDown} className={`flex h-5 w-5 items-center justify-center rounded text-[#ccc] transition hover:bg-[#f0f0f0] hover:text-[#888] ${isLast ? 'invisible' : ''}`}>
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
          onClick={() => isEditingNote ? onCloseNote() : onOpenNote()}
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
            value={localNote}
            onChange={e => setLocalNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveNote(localNote) } }}
            placeholder="Ej: perfecta para abrir el vals..."
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border border-[#d0d0d0] bg-[#fafafa] px-3 py-2 text-xs text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[10px] text-[#bbb]">Enter para guardar · Shift+Enter nueva línea</p>
            <div className="flex gap-1.5">
              <button onClick={onCloseNote} className="rounded-lg border border-[#e0e0e0] px-2.5 py-1 text-xs text-[#aaa] hover:bg-[#f5f5f5]">Cancelar</button>
              <button onClick={() => onSaveNote(localNote)} className="rounded-lg bg-[#48C9B0] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#3ab89f]">Guardar</button>
            </div>
          </div>
        </div>
      )}
      {song.notes && !isEditingNote && (
        <div onClick={onOpenNote} className="cursor-pointer border-t border-[#f0f0f0] px-3 pb-2.5 pt-2">
          <p className="text-xs text-[#888]">{song.notes}</p>
        </div>
      )}
    </div>
  )
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
  const [newCat, setNewCat]               = useState('')
  const [addingCat, setAddingCat]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const [mobileTab, setMobileTab]         = useState<'playlist' | 'config'>('playlist')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: settingsData }, { data: songsData }] = await Promise.all([
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

  const savePlaylistSettings = async (token: string | null, cats: string[]) => {
    await supabase.from('event_settings')
      .update({ playlist_token: token, playlist_categories: cats })
      .eq('event_id', id)
  }

  const handleGenerateToken = async () => {
    const token = generateToken()
    setPlaylistToken(token)
    await savePlaylistSettings(token, categories)
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
    setCategories(updated)
    setNewCat('')
    setAddingCat(false)
    await savePlaylistSettings(playlistToken, updated)
  }

  const removeCategory = async (cat: string) => {
    const updated = categories.filter(c => c !== cat)
    setCategories(updated)
    await savePlaylistSettings(playlistToken, updated)
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
  }

  const closeNote = () => setEditingNoteId(null)

const saveNote = async (songId: string, note: string) => {
  await supabase.from('song_recommendations').update({ notes: note || null }).eq('id', songId)
  setAllSongs(prev => prev.map(s => s.id === songId ? { ...s, notes: note || null } : s))
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

  const SongRows = ({ songs }: { songs: Song[] }) => (
    <div className="flex flex-col gap-2">
      {songs.map(song => {
        const globalIndex = allSongs.findIndex(s => s.id === song.id)
        return (
          <SongCard
            key={song.id}
            song={song}
            isFirst={globalIndex === 0}
            isLast={globalIndex === allSongs.length - 1}
            isEditingNote={editingNoteId === song.id}
            onMoveUp={() => moveUp(globalIndex)}
            onMoveDown={() => moveDown(globalIndex)}
            onOpenNote={() => openNote(song)}
            onCloseNote={closeNote}
            onSaveNote={(note) => saveNote(song.id, note)}
          />
        )
      })}
    </div>
  )

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
      <div className="hidden rounded-xl border border-[#e8e8e8] bg-white px-4 py-3 sm:block">
        <p className="text-[10px] uppercase tracking-wide text-[#999]">Sin categoría</p>
        <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">{allSongs.filter(s => !s.category).length}</p>
      </div>
    </div>
  )

  const CategoryManager = ({ compact = false }: { compact?: boolean }) => (
    <div className={compact ? 'flex items-center gap-1.5 flex-wrap' : 'flex flex-col gap-3'}>
      {!compact && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">Categorías</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
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
    </div>
  )

  const LinkPanel = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <div className={fullWidth ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
      {!playlistToken ? (
        <button
          onClick={handleGenerateToken}
          className="rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-3 py-1.5 text-xs font-medium text-[#1a9e88] transition hover:bg-[#e0faf5]"
        >
          + Generar link
        </button>
      ) : (
        <>
          <span className="max-w-[200px] truncate rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-2.5 py-1.5 text-xs text-[#0F6E56]">
            {playlistUrl}
          </span>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3ab89f]"
          >
            {copied ? '¡Copiado!' : 'Copiar link'}
          </button>
        </>
      )}
    </div>
  )

  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar canción, artista o persona..."
        className="min-w-[160px] flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-1.5 text-xs text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
      />
      {categories.length > 0 && (
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="rounded-lg border border-[#d0d0d0] bg-white px-2.5 py-1.5 text-xs text-[#555] outline-none transition focus:border-[#48C9B0]"
        >
          <option value="todas">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="">Sin categoría</option>
        </select>
      )}
      <select value={filterPlat} onChange={e => setFilterPlat(e.target.value)}
        className="rounded-lg border border-[#d0d0d0] bg-white px-2.5 py-1.5 text-xs text-[#555] outline-none transition focus:border-[#48C9B0]"
      >
        <option value="todas">Todas las plataformas</option>
        <option value="spotify">Spotify</option>
        <option value="youtube">YouTube</option>
        <option value="apple">Apple Music</option>
      </select>
      <div className="hidden h-5 w-px bg-[#e8e8e8] sm:block" />
      <div className="hidden sm:flex"><CategoryManager compact /></div>
      <div className="hidden h-5 w-px bg-[#e8e8e8] sm:block" />
      <div className="hidden sm:flex"><LinkPanel /></div>
    </div>
  )

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

  const MobileConfigPanel = () => (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#999]">Link para invitados</p>
        <LinkPanel fullWidth />
      </div>
      <CategoryManager />
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa]">

      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <div className="flex h-full flex-col sm:hidden">
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
        <div className="flex-1 overflow-y-auto p-4">
          {mobileTab === 'playlist' ? <DataList /> : <MobileConfigPanel />}
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────────────── */}
      <div className="hidden h-full flex-col sm:flex overflow-hidden">
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[#1D1E20]">Playlist</h1>
            {saving && <span className="text-xs text-[#aaa]">Guardando...</span>}
          </div>
          <KpiCards />
        </div>
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-6 py-3">
          <Toolbar />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <DataList />
        </div>
      </div>

    </div>
  )
}