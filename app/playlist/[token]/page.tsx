'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Event {
  id: string
  name: string
  event_date: string | null
  venue: string | null
}

interface Song {
  id: string
  guest_name: string
  song_title: string
  artist: string
  spotify_url: string | null
  category: string | null
  created_at: string
  thumbnail: string | null
  preview_url: string | null
}

interface SpotifyTrack {
  id: string
  title: string
  artist: string
  album: string
  thumbnail: string | null
  spotify_url: string
  duration_ms: number
  preview_url: string | null
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const months = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
  ]
  return `${day} de ${months[month - 1]} de ${year}`
}

const STORAGE_KEY_PREFIX = 'anfiora_playlist_'

export default function PlaylistPublicPage() {
  const { token } = useParams()

  const [event, setEvent]                 = useState<Event | null>(null)
  const [categories, setCategories]       = useState<string[]>([])
  const [songs, setSongs]                 = useState<Song[]>([])
  const [loading, setLoading]             = useState(true)
  const [notFound, setNotFound]           = useState(false)

  const [guestName, setGuestName]         = useState('')
  const [nameConfirmed, setNameConfirmed] = useState(false)
  const [category, setCategory]           = useState('')
  const [myCount, setMyCount]             = useState(0)
  const [done, setDone]                   = useState(false)

  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching]         = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [showResults, setShowResults]     = useState(false)
  const searchRef                         = useRef<HTMLDivElement>(null)
  const debounceRef                       = useRef<NodeJS.Timeout | null>(null)

  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState('')
  const [nameError, setNameError]         = useState('')

  const [playingId, setPlayingId]         = useState<string | null>(null)
  const [currentTime, setCurrentTime]     = useState(0)
  const audioRef                          = useRef<HTMLAudioElement | null>(null)

  const heroRef                           = useRef<HTMLDivElement>(null)
  const [heroHeight, setHeroHeight]       = useState(0)

  useEffect(() => {
    if (!heroRef.current) return
    const observer = new ResizeObserver(entries => {
      setHeroHeight(entries[0].contentRect.height)
    })
    observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { loadData() }, [])
  useEffect(() => { return () => { audioRef.current?.pause() } }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadData = async () => {
    const { data: settingsData } = await supabase
      .from('event_settings')
      .select('event_id, playlist_categories')
      .eq('playlist_token', token)
      .single()

    if (!settingsData) { setNotFound(true); setLoading(false); return }

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, event_date, venue')
      .eq('id', settingsData.event_id)
      .single()

    if (!eventData) { setNotFound(true); setLoading(false); return }

    setEvent(eventData)
    setCategories(Array.isArray(settingsData.playlist_categories) ? settingsData.playlist_categories : [])

    const { data: songsData } = await supabase
      .from('song_recommendations')
      .select('id, guest_name, song_title, artist, spotify_url, category, created_at, thumbnail, preview_url')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    setSongs(songsData || [])

    const storageKey = STORAGE_KEY_PREFIX + token
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.name && parsed.eventId === eventData.id) {
          setGuestName(parsed.name)
          setNameConfirmed(true)
          const { count } = await supabase
            .from('song_recommendations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventData.id)
            .eq('guest_name', parsed.name)
          const dbCount = count || 0
          setMyCount(dbCount)
          if (dbCount >= 3) setDone(true)
        }
      } catch {}
    }

    setLoading(false)
  }

  const handleConfirmName = async () => {
    const trimmed = guestName.trim()
    if (!trimmed) { setNameError('¿Cómo te llaman?'); return }
    setNameError('')

    const { count } = await supabase
      .from('song_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event!.id)
      .eq('guest_name', trimmed)

    const dbCount = count || 0
    setMyCount(dbCount)
    if (dbCount >= 3) { setDone(true); setNameConfirmed(true); return }

    localStorage.setItem(STORAGE_KEY_PREFIX + token, JSON.stringify({
      name: trimmed,
      eventId: event!.id,
    }))
    setNameConfirmed(true)
  }

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setShowResults(false); return }
    setSearching(true)
    setShowResults(true)
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.tracks || [])
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedTrack(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSearch(value), 400)
  }

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    setSearchQuery(`${track.title} — ${track.artist}`)
    setShowResults(false)
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!selectedTrack) { setSubmitError('Busca y selecciona una canción primero'); return }
    if (myCount >= 3) return

    const { count } = await supabase
      .from('song_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event!.id)
      .eq('guest_name', guestName.trim())

    if ((count || 0) >= 3) { setDone(true); setMyCount(3); return }

    setSubmitting(true)
    setSubmitError('')

    const { error } = await supabase.from('song_recommendations').insert({
      event_id: event!.id,
      guest_name: guestName.trim(),
      song_title: selectedTrack.title,
      artist: selectedTrack.artist,
      category: category || null,
      spotify_url: selectedTrack.spotify_url,
      thumbnail: selectedTrack.thumbnail,
      preview_url: selectedTrack.preview_url,
      duration_ms: selectedTrack.duration_ms,
    })

    if (error) { setSubmitError('Algo salió mal, intenta de nuevo'); setSubmitting(false); return }

    setSongs(prev => [...prev, {
      id: crypto.randomUUID(),
      guest_name: guestName.trim(),
      song_title: selectedTrack.title,
      artist: selectedTrack.artist,
      category: category || null,
      spotify_url: selectedTrack.spotify_url,
      created_at: new Date().toISOString(),
      thumbnail: selectedTrack.thumbnail,
      preview_url: selectedTrack.preview_url,
    }])

    const newCount = myCount + 1
    setMyCount(newCount)
    setSearchQuery('')
    setSelectedTrack(null)
    setCategory('')
    setSubmitError('')
    setSubmitting(false)
    if (newCount >= 3) setDone(true)
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

  const playingSong = playingId ? songs.find(s => s.id === playingId) : null
  const pct = currentTime > 0 ? (currentTime / 30) * 100 : 0

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#111]">
      <p className="text-sm text-white/40">Cargando...</p>
    </div>
  )

if (notFound) return (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
    <p
      className="text-3xl text-[#1D1E20]"
      style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}
    >
      Ups
    </p>
    <p className="mt-3 text-sm text-[#999]">
      No encontramos lo que buscas.<br />Es posible que este link haya expirado o no sea válido.
    </p>
    <p
      className="mt-10 text-[11px] uppercase tracking-[0.16em] text-[#ddd]"
      style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}
    >
      Anfiora
    </p>
  </div>
)

  return (
    <div className="flex min-h-screen flex-col bg-white">

      {/* HERO — sticky, mide su altura */}
      <div
        ref={heroRef}
        className="sticky top-0 z-20 flex flex-col items-center justify-center bg-[#111] px-6 py-12 text-center"
      >
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
          Playlist del evento
        </p>
        <h1
          className="text-3xl text-white"
          style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}
        >
          {event?.name}
        </h1>
        {event?.event_date && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/30">
            {formatEventDate(event.event_date)}
          </p>
        )}
        {event?.venue && (
          <p className="mt-1 text-[11px] text-white/20">{event.venue}</p>
        )}
        <div className="mt-6 h-px w-8 bg-white/15" />
      </div>

      {/* CONTENIDO — scroll normal */}
      <div className="flex flex-col">

        {/* FORM */}
        <div className="mx-auto w-full max-w-lg px-5 py-8">

          {!done && (
            <p className="mb-6 text-center text-sm text-[#999]">
              Recomienda las canciones que no pueden faltar.<br />Hasta 3 por persona.
            </p>
          )}

          {!nameConfirmed ? (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] uppercase tracking-[0.12em] text-[#bbb]">Tu nombre</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestName}
                  onChange={e => { setGuestName(e.target.value); setNameError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirmName() }}
                  placeholder="¿Cómo te llaman?"
                  className="flex-1 rounded-lg border border-[#e0e0e0] bg-white px-4 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#111]"
                />
                <button
                  onClick={handleConfirmName}
                  className="shrink-0 rounded-lg bg-[#111] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#333]"
                >
                  Continuar
                </button>
              </div>
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            </div>

          ) : done ? (
            <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-6 py-5 text-center">
              <p
                className="text-lg text-[#111]"
                style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}
              >
                ¡Gracias, {guestName.split(' ')[0]}!
              </p>
              <p className="mt-1 text-sm text-[#999]">Ya agregaste tus 3 canciones.</p>
            </div>

          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-[0.12em] text-[#bbb]">
                  Hola, {guestName.split(' ')[0]}
                </label>
                <span className="text-[10px] uppercase tracking-[0.08em] text-[#bbb]">
                  {myCount}/3 canciones
                </span>
              </div>

              {categories.length > 0 && (
                <>
                  <label className="text-[10px] uppercase tracking-[0.12em] text-[#bbb]">Etapa</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat: string) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(prev => prev === cat ? '' : cat)}
                        className={'rounded-full border px-3 py-1 text-xs transition ' +
                          (category === cat
                            ? 'border-[#111] bg-[#111] text-white'
                            : 'border-[#e0e0e0] text-[#666] hover:border-[#111] hover:text-[#111]'
                          )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <label className="text-[10px] uppercase tracking-[0.12em] text-[#bbb]">Canción</label>
              <div ref={searchRef} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowResults(true) }}
                  placeholder="Busca una canción en Spotify..."
                  className="w-full rounded-lg border border-[#e0e0e0] bg-white px-4 py-2.5 text-sm text-[#1D1E20] outline-none transition focus:border-[#111]"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#111] border-t-transparent" />
                  </div>
                )}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-lg">
                    {searchResults.map(track => (
                      <button
                        key={track.id}
                        onClick={() => handleSelectTrack(track)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f5f5f5]"
                      >
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt={track.title} className="h-10 w-10 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded bg-[#f0f0f0]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#1D1E20]">{track.title}</p>
                          <p className="truncate text-xs text-[#999]">{track.artist} · {track.album}</p>
                        </div>
                        <span className="shrink-0 text-xs text-[#ccc]">{formatDuration(track.duration_ms)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedTrack && (
                <div className="rounded-xl border border-[#111] bg-[#fafafa] px-4 py-3">
                  <div className="flex items-center gap-3">
                    {selectedTrack.thumbnail && (
                      <img src={selectedTrack.thumbnail} alt={selectedTrack.title} className="h-10 w-10 shrink-0 rounded object-cover" />
                    )}
                    {selectedTrack.preview_url && (
                      <button
                        onClick={() => togglePlay({
                          id: 'preview',
                          guest_name: '',
                          song_title: selectedTrack.title,
                          artist: selectedTrack.artist,
                          spotify_url: selectedTrack.spotify_url,
                          category: null,
                          created_at: '',
                          thumbnail: selectedTrack.thumbnail,
                          preview_url: selectedTrack.preview_url,
                        })}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111]"
                      >
                        {playingId === 'preview' ? (
                          <svg width="7" height="9" viewBox="0 0 8 10" fill="none">
                            <rect x="0" y="0" width="3" height="10" fill="white" />
                            <rect x="5" y="0" width="3" height="10" fill="white" />
                          </svg>
                        ) : (
                          <svg width="7" height="9" viewBox="0 0 8 10" fill="none">
                            <path d="M1 1L7 5L1 9V1Z" fill="white" />
                          </svg>
                        )}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1D1E20]">{selectedTrack.title}</p>
                      <p className="truncate text-xs text-[#999]">{selectedTrack.artist}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTrack(null)
                        setSearchQuery('')
                        if (playingId === 'preview') { audioRef.current?.pause(); setPlayingId(null) }
                      }}
                      className="shrink-0 text-[#ccc] hover:text-[#888]"
                    >
                      ✕
                    </button>
                  </div>
                  {selectedTrack.preview_url && playingId === 'preview' && (
                    <div className="mt-3 px-1">
                      <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#e0e0e0]">
                        <div className="h-full rounded-full bg-[#111] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-[#999]">{formatTime(currentTime)} / 0:30</p>
                    </div>
                  )}
                </div>
              )}

              {submitError && <p className="text-xs text-red-500">{submitError}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedTrack}
                className="w-full rounded-lg bg-[#111] py-3 text-sm font-medium text-white transition hover:bg-[#333] disabled:opacity-30"
              >
                {submitting
                  ? 'Guardando...'
                  : myCount === 0
                    ? 'Agregar canción'
                    : `Agregar canción (${myCount + 1} de 3)`}
              </button>
            </div>
          )}
        </div>

        {/* LISTA — barra sticky + canciones */}
        {songs.length > 0 && (
          <div className="w-full">

            {/* Barra sticky del contador — full width, debajo del hero */}
            <div
              className="sticky z-10 w-full border-y border-[#f0f0f0] bg-white py-2.5"
              style={{ top: `${heroHeight}px` }}
            >
              <div className="mx-auto flex max-w-lg items-center gap-3 px-5">
                <div className="h-px flex-1 bg-[#f0f0f0]" />
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#ccc]">
                  {songs.length} canción{songs.length !== 1 ? 'es' : ''} en la lista
                </p>
                <div className="h-px flex-1 bg-[#f0f0f0]" />
              </div>
            </div>

            {/* Cards de canciones */}
            <div className="mx-auto w-full max-w-lg px-5 py-4">
              <div className="flex flex-col gap-2">
                {songs.map(song => (
                  <div
                    key={song.id}
                    className={`rounded-xl border bg-white px-4 py-3 transition ${playingId === song.id ? 'border-[#111]' : 'border-[#f0f0f0]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePlay(song)}
                        disabled={!song.preview_url}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition
                          ${playingId === song.id ? 'border-[#111] bg-[#111]' : 'border-[#e0e0e0] hover:border-[#111]'}
                          ${!song.preview_url ? 'cursor-not-allowed opacity-20' : ''}`}
                      >
                        {playingId === song.id ? (
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
                      {song.thumbnail ? (
                        <img src={song.thumbnail} alt={song.song_title} className="h-9 w-9 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded bg-[#f5f5f5]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${playingId === song.id ? 'text-[#111]' : 'text-[#1D1E20]'}`}>
                          {song.song_title}
                        </p>
                        <p className="truncate text-xs text-[#bbb]">
                          {song.artist}
                          <span className="mx-1.5 text-[#ddd]">·</span>
                          <span className="text-[#48C9B0]">{song.guest_name}</span>
                        </p>
                      </div>
                      {song.category && (
                        <span className="shrink-0 rounded-full border border-[#f0f0f0] px-2.5 py-0.5 text-[10px] text-[#bbb]">
                          {song.category}
                        </span>
                      )}
                    </div>
                    {playingId === song.id && (
                      <div className="mt-2.5 px-0.5">
                        <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#e8e8e8]">
                          <div className="h-full rounded-full bg-[#111] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-right text-[10px] text-[#999]">{formatTime(currentTime)} / 0:30</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p
          className="mb-8 mt-4 text-center text-[11px] uppercase tracking-[0.16em] text-[#ddd]"
          style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}
        >
          Anfiora
        </p>
      </div>

      {/* Mini player móvil */}
      {playingSong && playingId !== 'preview' && (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-[#e8e8e8] bg-white px-4 py-3 sm:hidden">
          {playingSong.thumbnail && (
            <img src={playingSong.thumbnail} alt={playingSong.song_title} className="h-8 w-8 shrink-0 rounded object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#1D1E20]">{playingSong.song_title}</p>
            <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-[#e8e8e8]">
              <div className="h-full rounded-full bg-[#111] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button
            onClick={() => togglePlay(playingSong)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111]"
          >
            <svg width="7" height="9" viewBox="0 0 8 10" fill="none">
              <rect x="0" y="0" width="3" height="10" fill="white" />
              <rect x="5" y="0" width="3" height="10" fill="white" />
            </svg>
          </button>
          <span className="text-[10px] text-[#bbb]">{formatTime(currentTime)}</span>
        </div>
      )}
    </div>
  )
}