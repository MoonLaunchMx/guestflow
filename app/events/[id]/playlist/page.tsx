'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  thumbnail: string | null
  preview_url: string | null
  duration_ms: number | null
}

function generateToken(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MiniPlayer({
  song, playing, currentTime, onToggle,
}: {
  song: Song
  playing: boolean
  currentTime: number
  onToggle: () => void
}) {
  const pct = (currentTime / 30) * 100
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-[#e8e8e8] bg-white px-6 py-3">
      {song.thumbnail && (
        <img src={song.thumbnail} alt={song.song_title} className="h-8 w-8 shrink-0 rounded object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#1D1E20]">
          {song.song_title} · <span className="text-[#888]">{song.artist}</span>
        </p>
        <p className="text-[10px] text-[#bbb]">preview 30 seg</p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#e8e8e8]">
          <div className="h-full rounded-full bg-[#48C9B0] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button onClick={onToggle} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#48C9B0]">
        {playing ? (
          <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
            <rect x="0" y="0" width="3" height="10" fill="white" />
            <rect x="5" y="0" width="3" height="10" fill="white" />
          </svg>
        ) : (
          <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
            <path d="M1 1L7 5L1 9V1Z" fill="white" />
          </svg>
        )}
      </button>
      <span className="text-[10px] text-[#bbb]">{formatTime(currentTime)} / 0:30</span>
    </div>
  )
}

function SongRow({
  song, isPlaying, onTogglePlay, onEditNote, isEditingNote, onCloseNote, onSaveNote,
}: {
  song: Song
  isPlaying: boolean
  onTogglePlay: () => void
  onEditNote: () => void
  isEditingNote: boolean
  onCloseNote: () => void
  onSaveNote: (note: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id })
  const [localNote, setLocalNote] = useState(song.notes || '')

  useEffect(() => {
    if (isEditingNote) setLocalNote(song.notes || '')
  }, [isEditingNote, song.notes])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-white transition ${isPlaying ? 'border-[#48C9B0] bg-[#f0fdfb]' : 'border-[#e8e8e8]'}`}
    >
      <div className="flex items-center gap-3 px-3 py-3">

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab flex-col gap-[3px] px-0.5 py-1 active:cursor-grabbing"
        >
          <span className="block h-px w-3 rounded bg-[#ccc]" />
          <span className="block h-px w-3 rounded bg-[#ccc]" />
          <span className="block h-px w-3 rounded bg-[#ccc]" />
        </div>

        {/* Play button */}
        <button
          onClick={onTogglePlay}
          disabled={!song.preview_url}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition
            ${isPlaying ? 'border-[#48C9B0] bg-[#48C9B0]' : 'border-[#e0e0e0] bg-white hover:border-[#48C9B0]'}
            ${!song.preview_url ? 'cursor-not-allowed opacity-30' : ''}`}
        >
          {isPlaying ? (
            <svg width="7" height="9" viewBox="0 0 8 10" fill="none">
              <rect x="0" y="0" width="3" height="10" fill="white" />
              <rect x="5" y="0" width="3" height="10" fill="white" />
            </svg>
          ) : (
            <svg width="7" height="9" viewBox="0 0 8 10" fill="none">
              <path d="M1 1L7 5L1 9V1Z" fill="#ccc" />
            </svg>
          )}
        </button>

        {/* Thumbnail */}
        {song.thumbnail ? (
          <img src={song.thumbnail} alt={song.song_title} className="h-9 w-9 shrink-0 rounded object-cover" />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded bg-[#f0f0f0]" />
        )}

        {/* Título + Artista */}
        <div className="w-48 shrink-0">
          <p className={`truncate text-sm font-medium ${isPlaying ? 'text-[#48C9B0]' : 'text-[#1D1E20]'}`}>
            {song.song_title}
          </p>
          <p className="truncate text-xs text-[#888]">{song.artist}</p>
          {isPlaying && (
            <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-[#e8e8e8]">
              <div className="h-full animate-pulse rounded-full bg-[#48C9B0]" style={{ width: '60%' }} />
            </div>
          )}
        </div>

        {/* Recomendado por */}
        <div className="w-24 shrink-0">
          <p className="truncate text-xs text-[#48C9B0]">{song.guest_name}</p>
        </div>

        {/* Duración */}
        <div className="w-10 shrink-0 text-right">
          <p className="text-xs text-[#bbb]">
            {song.duration_ms ? `${Math.floor(song.duration_ms / 60000)}:${String(Math.floor((song.duration_ms % 60000) / 1000)).padStart(2, '0')}` : '—'}
          </p>
        </div>

        {/* Nota inline */}
        <div className="flex min-w-0 flex-1 items-center">
          {isEditingNote ? (
            <div className="flex flex-1 items-center gap-1.5">
              <input
                autoFocus
                value={localNote}
                onChange={e => setLocalNote(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveNote(localNote)
                  if (e.key === 'Escape') onCloseNote()
                }}
                placeholder="Nota para el DJ..."
                className="flex-1 rounded-lg border border-[#48C9B0] bg-white px-2.5 py-1 text-xs text-[#1D1E20] outline-none"
              />
              <button
                onClick={() => onSaveNote(localNote)}
                className="shrink-0 rounded-lg bg-[#48C9B0] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#3ab89f]"
              >
                ✓
              </button>
              <button
                onClick={onCloseNote}
                className="shrink-0 rounded-lg border border-[#e0e0e0] px-2.5 py-1 text-xs text-[#aaa] hover:bg-[#f5f5f5]"
              >
                ✕
              </button>
            </div>
          ) : song.notes ? (
            <button
              onClick={onEditNote}
              className="max-w-full truncate rounded-lg border border-[#48C9B0] bg-[#f0fdfb] px-2.5 py-1 text-left text-xs text-[#1a9e88] hover:bg-[#e0faf5]"
            >
              {song.notes}
            </button>
          ) : (
            <button
              onClick={onEditNote}
              className="rounded-lg border border-dashed border-[#e0e0e0] px-2.5 py-1 text-xs text-[#ccc] transition hover:border-[#48C9B0] hover:text-[#1a9e88]"
            >
              + Nota
            </button>
          )}
        </div>

        {/* Etapa */}
        {song.category ? (
          <span className="shrink-0 rounded-full border border-[#e8e8e8] px-2.5 py-0.5 text-xs text-[#aaa]">
            {song.category}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-dashed border-[#e0e0e0] px-2.5 py-0.5 text-xs text-[#ccc]">
            Sin etapa
          </span>
        )}

        {/* Spotify */}
        {song.spotify_url && (
          <button
            onClick={() => window.open(song.spotify_url!, '_blank')}
            className="shrink-0 rounded-full border border-[#e0e0e0] px-2.5 py-0.5 text-xs text-[#aaa] transition hover:border-[#1DB954] hover:text-[#1DB954]"
          >
            Spotify ↗
          </button>
        )}
      </div>
    </div>
  )
}

function DragCard({ song }: { song: Song }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#48C9B0] bg-white px-3 py-2.5 shadow-lg opacity-95">
      <div className="flex shrink-0 cursor-grabbing flex-col gap-[3px] px-0.5 py-1">
        <span className="block h-px w-3 rounded bg-[#ccc]" />
        <span className="block h-px w-3 rounded bg-[#ccc]" />
        <span className="block h-px w-3 rounded bg-[#ccc]" />
      </div>
      {song.thumbnail ? (
        <img src={song.thumbnail} alt={song.song_title} className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-8 w-8 shrink-0 rounded bg-[#f0f0f0]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#1D1E20]">{song.song_title}</p>
        <p className="truncate text-[10px] text-[#888]">{song.artist}</p>
      </div>
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
  const [search, setSearch]               = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [newCat, setNewCat]               = useState('')
  const [addingCat, setAddingCat]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const [mobileTab, setMobileTab]         = useState<'playlist' | 'config'>('playlist')
  const [activeDragId, setActiveDragId]   = useState<string | null>(null)

  const [playingId, setPlayingId]         = useState<string | null>(null)
  const [currentTime, setCurrentTime]     = useState(0)
  const audioRef                          = useRef<HTMLAudioElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  useEffect(() => { loadData() }, [])
  useEffect(() => { return () => { audioRef.current?.pause() } }, [])

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

  const togglePlay = useCallback((song: Song) => {
    if (!song.preview_url) return
    if (playingId === song.id) {
      if (audioRef.current?.paused) {
        audioRef.current.play()
      } else {
        audioRef.current?.pause()
        setPlayingId(null)
      }
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(song.preview_url)
    audioRef.current = audio
    setPlayingId(song.id)
    setCurrentTime(0)
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended', () => { setPlayingId(null); setCurrentTime(0) })
    audio.play()
  }, [playingId])

  const toggleMiniPlayer = useCallback(() => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play()
      setPlayingId(prev => prev)
    } else {
      audioRef.current.pause()
      setPlayingId(null)
    }
  }, [])

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(event.active.id as string)

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = allSongs.findIndex(s => s.id === active.id)
    const newIndex = allSongs.findIndex(s => s.id === over.id)
    const reordered = arrayMove(allSongs, oldIndex, newIndex).map((s, i) => ({ ...s, position: i }))
    setAllSongs(reordered)
    setSaving(true)
    await Promise.all(reordered.map(s =>
      supabase.from('song_recommendations').update({ position: s.position }).eq('id', s.id)
    ))
    setSaving(false)
  }

  const saveNote = async (songId: string, note: string) => {
    await supabase.from('song_recommendations').update({ notes: note || null }).eq('id', songId)
    setAllSongs(prev => prev.map(s => s.id === songId ? { ...s, notes: note || null } : s))
    setEditingNoteId(null)
  }

  const totalSongs     = allSongs.length
  const uniqueGuests   = new Set(allSongs.map(s => s.guest_name)).size
  const activeDragSong = activeDragId ? allSongs.find(s => s.id === activeDragId) : null
  const playingSong    = playingId ? allSongs.find(s => s.id === playingId) : null

  const filtered = allSongs.filter(s => {
    const matchCat    = filterCat === 'todas' || s.category === filterCat || (filterCat === '__none__' && !s.category)
    const matchSearch = search === '' ||
      s.song_title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      s.guest_name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <div className="p-8 text-sm text-[#666]">Cargando playlist...</div>

  const StageManager = ({ compact = false }: { compact?: boolean }) => (
    <div className={compact ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-col gap-3'}>
      {!compact && <p className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">Etapas</p>}
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
              placeholder="Nueva etapa..."
              className="w-28 rounded-lg border border-[#48C9B0] px-2 py-1 text-xs outline-none"
            />
            <button onClick={addCategory} className="rounded-lg bg-[#48C9B0] px-2 py-1 text-xs text-white">✓</button>
            <button onClick={() => setAddingCat(false)} className="rounded-lg border border-[#e0e0e0] px-2 py-1 text-xs text-[#aaa]">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="rounded-full border border-dashed border-[#ccc] px-2.5 py-1 text-xs text-[#aaa] transition hover:border-[#48C9B0] hover:text-[#48C9B0]"
          >
            + Etapa
          </button>
        )}
      </div>
    </div>
  )

  const SongList = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={filtered.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {filtered.map(song => (
            <SongRow
              key={song.id}
              song={song}
              isPlaying={playingId === song.id}
              onTogglePlay={() => togglePlay(song)}
              onEditNote={() => setEditingNoteId(song.id)}
              isEditingNote={editingNoteId === song.id}
              onCloseNote={() => setEditingNoteId(null)}
              onSaveNote={(note) => saveNote(song.id, note)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeDragSong && <DragCard song={activeDragSong} />}
      </DragOverlay>
    </DndContext>
  )

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-base font-semibold text-[#1D1E20]">Sin recomendaciones aún</h2>
      <p className="mt-1 text-sm text-[#999]">Comparte el link con tus invitados.</p>
    </div>
  )

  const MobileConfigPanel = () => (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#999]">Link para invitados</p>
        {!playlistToken ? (
          <button
            onClick={handleGenerateToken}
            className="rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-3 py-1.5 text-xs font-medium text-[#1a9e88]"
          >
            + Generar link
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="truncate rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-2.5 py-1.5 text-xs text-[#0F6E56]">
              {playlistUrl}
            </span>
            <button
              onClick={copyLink}
              className="rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {copied ? '¡Copiado!' : 'Copiar link'}
            </button>
          </div>
        )}
      </div>
      <StageManager />
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa]">

      {/* MOBILE */}
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
              <p className="text-[9px] uppercase tracking-wide text-[#999]">Etapas</p>
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
          {mobileTab === 'playlist'
            ? (totalSongs === 0 ? <EmptyState /> : <SongList />)
            : <MobileConfigPanel />}
        </div>
        {playingSong && (
          <MiniPlayer
            song={playingSong}
            playing={!audioRef.current?.paused}
            currentTime={currentTime}
            onToggle={toggleMiniPlayer}
          />
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden h-full flex-col overflow-hidden sm:flex">

        {/* Header + KPIs */}
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[#1D1E20]">Playlist</h1>
            {saving && <span className="text-xs text-[#aaa]">Guardando orden...</span>}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-[#999]">Canciones</p>
              <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">{totalSongs}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-[#999]">Participaron</p>
              <p className="mt-1 text-2xl font-semibold text-[#48C9B0]">{uniqueGuests}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-[#999]">Etapas</p>
              <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">{categories.length}</p>
            </div>
            <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-[#999]">Sin etapa</p>
              <p className="mt-1 text-2xl font-semibold text-[#1D1E20]">{allSongs.filter(s => !s.category).length}</p>
            </div>
          </div>
        </div>

        {/* Toolbar — search fijo + filtro negro + etapas + link+copiar a la derecha */}
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-6 py-2.5">
          <div className="flex items-center gap-2">

            {/* Search — ancho fijo, no crece */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar canción, artista..."
              className="w-52 shrink-0 rounded-lg border border-[#d0d0d0] bg-white px-3 py-1.5 text-xs text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
            />

            {/* Filtro etapa negro */}
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="shrink-0 rounded-lg border border-[#1D1E20] bg-[#1D1E20] px-2.5 py-1.5 text-xs text-white outline-none"
            >
              <option value="todas">Todas las etapas</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__none__">Sin etapa</option>
            </select>

            <div className="h-4 w-px shrink-0 bg-[#e8e8e8]" />

            {/* Etapas config — ocupa el espacio disponible */}
            <div className="min-w-0 flex-1">
              <StageManager compact />
            </div>

            <div className="h-4 w-px shrink-0 bg-[#e8e8e8]" />

            {/* Link + Copiar — siempre a la derecha */}
            {!playlistToken ? (
              <button
                onClick={handleGenerateToken}
                className="shrink-0 rounded-lg border border-dashed border-[#48C9B0] bg-[#f0fdfb] px-3 py-1.5 text-xs font-medium text-[#1a9e88] transition hover:bg-[#e0faf5]"
              >
                + Generar link
              </button>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <span className="max-w-[180px] truncate text-xs text-[#48C9B0]">{playlistUrl}</span>
                <button
                  onClick={copyLink}
                  className="shrink-0 rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3ab89f]"
                >
                  {copied ? '¡Copiado!' : 'Copiar link'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {totalSongs === 0 ? <EmptyState /> : <SongList />}
        </div>

        {/* Mini player */}
        {playingSong && (
          <MiniPlayer
            song={playingSong}
            playing={!audioRef.current?.paused}
            currentTime={currentTime}
            onToggle={toggleMiniPlayer}
          />
        )}
      </div>
    </div>
  )
}