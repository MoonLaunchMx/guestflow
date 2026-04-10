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
  const [allSongs, setAllSongs]       = useState<Song[]>([])
  const [categories, setCategories]   = useState<string[]>([])
  const [eventName, setEventName]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [filterCat, setFilterCat]     = useState('todas')
  const [filterPlat, setFilterPlat]   = useState('todas')
  const [search, setSearch]           = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue]     = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: eventData } = await supabase
      .from('events').select('name, playlist_categories').eq('id', id).single()
    if (eventData) {
      setEventName(eventData.name || '')
      setCategories(Array.isArray(eventData.playlist_categories) ? eventData.playlist_categories : [])
    }
    const { data: songsData } = await supabase
      .from('song_recommendations').select('*').eq('event_id', id)
      .order('position', { ascending: true })
    setAllSongs(songsData || [])
    setLoading(false)
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

  const filtered = allSongs.filter(s => {
    const matchCat   = filterCat  === 'todas' || s.category === filterCat
    const matchPlat  = filterPlat === 'todas' || (s.spotify_url && detectPlatform(s.spotify_url) === filterPlat)
    const matchSearch = search === '' ||
      s.song_title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      s.guest_name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchPlat && matchSearch
  })

  if (loading) return <div className="p-8 text-sm text-[#666]">Cargando playlist...</div>

  const totalSongs = allSongs.length

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* Header */}
      <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl">Playlist</h1>
            <p className="mt-0.5 text-xs text-[#666]">
              {totalSongs === 0 ? 'Sin recomendaciones aún' : `${totalSongs} canción${totalSongs !== 1 ? 'es' : ''}`}
              {saving && <span className="ml-2 text-[#aaa]">· Guardando...</span>}
            </p>
          </div>
        </div>

        {totalSongs > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar canción, artista o persona..."
              className="flex-1 min-w-[180px] rounded-lg border border-[#d0d0d0] bg-white px-3 py-1.5 text-xs text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
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
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          {totalSongs === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="text-base font-semibold text-[#1D1E20]">Sin recomendaciones aún</h2>
              <p className="mt-1 text-sm text-[#999]">Comparte el link desde Configuración.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#999]">Sin resultados para ese filtro.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(song => {
                const globalIndex = allSongs.findIndex(s => s.id === song.id)
                const platform = song.spotify_url ? detectPlatform(song.spotify_url) : 'unknown'
                const platformConfig = PLATFORM_CONFIG[platform]
                const isFirst = globalIndex === 0
                const isLast = globalIndex === allSongs.length - 1
                const isEditingNote = editingNoteId === song.id

                return (
                  <div key={song.id} className="rounded-xl border border-[#e8e8e8] bg-white">

                    {/* Fila principal */}
                    <div className="flex items-center gap-2 px-3 py-3">

                      {/* Flechas */}
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button onClick={() => moveUp(globalIndex)} className={`flex h-5 w-5 items-center justify-center rounded text-[#ccc] transition hover:bg-[#f0f0f0] hover:text-[#888] ${isFirst ? 'invisible' : ''}`}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,2 9,8 1,8"/></svg>
                        </button>
                        <button onClick={() => moveDown(globalIndex)} className={`flex h-5 w-5 items-center justify-center rounded text-[#ccc] transition hover:bg-[#f0f0f0] hover:text-[#888] ${isLast ? 'invisible' : ''}`}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,8 9,2 1,2"/></svg>
                        </button>
                      </div>

                      {/* Info */}
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

                      {/* Botón nota */}
                      <button
                        onClick={() => isEditingNote ? setEditingNoteId(null) : openNote(song)}
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition
                          ${song.notes
                            ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]'
                            : isEditingNote
                              ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]'
                              : 'border-[#e0e0e0] text-[#bbb] hover:border-[#48C9B0] hover:text-[#1a9e88]'
                          }`}
                      >
                        {song.notes ? 'Nota' : '+ Nota'}
                      </button>

                      {/* Plataforma */}
                      {song.spotify_url && (
                        <button
                          onClick={() => window.open(song.spotify_url!, '_blank')}
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${platformConfig.color}`}
                        >
                          {platformConfig.label}
                        </button>
                      )}
                    </div>

                    {/* Nota inline */}
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
                            <button onClick={() => setEditingNoteId(null)} className="rounded-lg border border-[#e0e0e0] px-2.5 py-1 text-xs text-[#aaa] hover:bg-[#f5f5f5]">
                              Cancelar
                            </button>
                            <button onClick={() => saveNote(song.id)} className="rounded-lg bg-[#48C9B0] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#3ab89f]">
                              Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nota guardada visible */}
                    {song.notes && !isEditingNote && (
                      <div
                        onClick={() => openNote(song)}
                        className="cursor-pointer border-t border-[#f0f0f0] px-3 pb-2.5 pt-2"
                      >
                        <p className="text-xs text-[#888]">{song.notes}</p>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}