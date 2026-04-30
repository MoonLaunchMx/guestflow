'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Event {
  id: string
  name: string
}

interface Song {
  id: string
  guest_name: string
  song_title: string
  artist: string
  spotify_url: string | null
  category: string | null
  created_at: string
}

interface TrackPreview {
  title: string
  artist: string
  thumbnail: string | null
  platform: 'spotify' | 'youtube' | 'apple' | 'unknown'
}

function detectPlatform(url: string): 'spotify' | 'youtube' | 'apple' | 'unknown' {
  if (url.includes('spotify.com')) return 'spotify'
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) return 'youtube'
  if (url.includes('music.apple.com')) return 'apple'
  return 'unknown'
}

async function fetchTrackInfo(url: string): Promise<TrackPreview | null> {
  const platform = detectPlatform(url)
  if (platform === 'unknown') return null
  try {
    let oembedUrl = ''
    if (platform === 'spotify') {
      oembedUrl = 'https://open.spotify.com/oembed?url=' + encodeURIComponent(url)
    } else if (platform === 'youtube') {
      oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json'
    } else if (platform === 'apple') {
      oembedUrl = 'https://music.apple.com/oembed?url=' + encodeURIComponent(url)
    }
    const res = await fetch(oembedUrl)
    if (!res.ok) return null
    const data = await res.json()
    let title = data.title || ''
    let artist = ''
    if (platform === 'spotify') {
      const parts = title.split(' - ')
      if (parts.length >= 2) { title = parts[0].trim(); artist = parts.slice(1).join(' - ').trim() }
      if (!artist && data.author_name) artist = data.author_name
    } else if (platform === 'youtube') {
      const parts = title.split(' - ')
      if (parts.length >= 2) { title = parts[0].trim(); artist = parts[1].replace(' - Topic', '').trim() }
      if (!artist && data.author_name) artist = data.author_name
    } else if (platform === 'apple') {
      if (data.author_name) artist = data.author_name
    }
    return { title, artist, thumbnail: data.thumbnail_url || null, platform }
  } catch {
    return null
  }
}

export default function PlaylistPublicPage() {
  const { token } = useParams()

  const [event, setEvent]             = useState<Event | null>(null)
  const [categories, setCategories]   = useState<string[]>([])
  const [songs, setSongs]             = useState<Song[]>([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [myCount, setMyCount]         = useState(0)
  const [done, setDone]               = useState(false)
  const [guestName, setGuestName]     = useState('')
  const [category, setCategory]       = useState('')
  const [musicUrl, setMusicUrl]       = useState('')
  const [fetching, setFetching]       = useState(false)
  const [fetchError, setFetchError]   = useState('')
  const [track, setTrack]             = useState<TrackPreview | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: settingsData } = await supabase
      .from('event_settings')
      .select('event_id, playlist_categories')
      .eq('playlist_token', token)
      .single()

    if (!settingsData) { setNotFound(true); setLoading(false); return }

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', settingsData.event_id)
      .single()

    if (!eventData) { setNotFound(true); setLoading(false); return }

    setEvent(eventData)
    setCategories(Array.isArray(settingsData.playlist_categories) ? settingsData.playlist_categories : [])

    const { data: songsData } = await supabase
      .from('song_recommendations')
      .select('*')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    setSongs(songsData || [])
    setLoading(false)
  }

  const handleUrlBlur = async () => {
    const url = musicUrl.trim()
    if (!url) return
    const platform = detectPlatform(url)
    if (platform === 'unknown') {
      setFetchError('Pega un link de Spotify, YouTube Music o Apple Music')
      setTrack(null)
      return
    }
    setFetching(true); setFetchError(''); setTrack(null)
    const result = await fetchTrackInfo(url)
    setFetching(false)
    if (!result) { setFetchError('No pudimos leer ese link. Verifica que sea una canción válida.'); return }
    setTrack(result)
  }

  const handleSubmit = async () => {
    if (!guestName.trim()) { setSubmitError('¿Cómo te llaman?'); return }
    if (!track) { setSubmitError('Pega un link de música primero'); return }
    if (myCount >= 3) return
    setSubmitting(true); setSubmitError('')

    const { error } = await supabase.from('song_recommendations').insert({
      event_id: event!.id,
      guest_name: guestName.trim(),
      song_title: track.title,
      artist: track.artist,
      category: category || null,
      spotify_url: musicUrl.trim(),
    })

    // TEMPORAL: muestra el error real para diagnosticar
    if (error) {
      console.error('Supabase error:', JSON.stringify(error))
      setSubmitError('Error: ' + error.message)
      setSubmitting(false)
      return
    }

    setSongs(prev => [...prev, {
      id: crypto.randomUUID(),
      guest_name: guestName.trim(),
      song_title: track.title,
      artist: track.artist,
      category: category || null,
      spotify_url: musicUrl.trim(),
      created_at: new Date().toISOString(),
    }])
    setMyCount(c => c + 1)
    setMusicUrl(''); setTrack(null); setCategory('')
    setFetchError(''); setSubmitError('')
    setSubmitting(false)
    if (myCount + 1 >= 3) setDone(true)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-[#999]">Cargando...</p>
    </div>
  )

  if (notFound) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="text-lg font-bold text-[#1D1E20]">Link no encontrado</h1>
      <p className="mt-1 text-sm text-[#999]">Este link no existe o fue desactivado.</p>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-white">

      <div className="sticky top-0 z-10 border-b border-[#e8e8e8] bg-white px-4 pt-5 pb-4 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#bbb]">{event?.name}</p>
              <h1 className="text-base font-bold text-[#1D1E20]">Playlist del evento</h1>
            </div>
            {!done && myCount > 0 && (
              <span className="rounded-full border border-[#e0e0e0] px-2.5 py-0.5 text-xs text-[#aaa]">
                {myCount}/3 canciones
              </span>
            )}
          </div>

          {!done ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                disabled={myCount > 0}
                placeholder="¿Cómo te llaman?"
                className="w-full rounded-lg border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0] disabled:bg-[#f5f5f5] disabled:text-[#999]"
              />

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat: string) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(prev => prev === cat ? '' : cat)}
                      className={'rounded-full border px-3 py-1 text-xs transition ' + (category === cat ? 'border-[#48C9B0] bg-[#48C9B0] font-medium text-white' : 'border-[#d0d0d0] bg-white text-[#555] hover:border-[#48C9B0] hover:text-[#1a9e88]')}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={musicUrl}
                  onChange={e => { setMusicUrl(e.target.value); setTrack(null); setFetchError('') }}
                  onBlur={handleUrlBlur}
                  placeholder="Link de Spotify, YouTube Music o Apple Music..."
                  className="flex-1 rounded-lg border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1D1E20] outline-none transition focus:border-[#48C9B0]"
                />
                {musicUrl && !track && (
                  <button
                    onClick={handleUrlBlur}
                    disabled={fetching}
                    className="shrink-0 rounded-lg bg-[#48C9B0] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-50"
                  >
                    {fetching ? '...' : 'Buscar'}
                  </button>
                )}
              </div>

              {fetchError && <p className="text-xs text-red-500">{fetchError}</p>}

              {track && (
                <div className="flex items-center gap-3 rounded-xl border border-[#48C9B0] bg-[#f0fdfb] px-3 py-2">
                  {track.thumbnail && (
                    <img src={track.thumbnail} alt={track.title} className="h-8 w-8 shrink-0 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#1D1E20]">{track.title}</p>
                    <p className="truncate text-xs text-[#666]">{track.artist}</p>
                  </div>
                </div>
              )}

              {submitError && <p className="text-xs text-red-500">{submitError}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || !track}
                className="w-full rounded-lg bg-[#48C9B0] py-2 text-sm font-semibold text-white transition hover:bg-[#3ab89f] disabled:opacity-40"
              >
                {submitting
                  ? 'Guardando...'
                  : myCount === 0
                    ? 'Agregar canción'
                    : myCount === 1
                      ? 'Agregar canción (1 de 3)'
                      : 'Agregar canción (2 de 3)'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-center">
              <p className="text-sm font-bold text-[#1D1E20]">¡Listo!</p>
              <p className="text-xs text-[#888]">Gracias por tus recomendaciones.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-lg">
          {songs.length > 0 && (
            <>
              <p className="mb-3 text-xs text-[#bbb]">
                {songs.length} canción{songs.length !== 1 ? 'es' : ''} en la lista
              </p>
              <div className="flex flex-col gap-2">
                {songs.map(song => (
                  <div key={song.id} className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1D1E20]">{song.song_title}</p>
                      <p className="truncate text-xs text-[#aaa]">{song.artist}</p>
                    </div>
                    {song.category && (
                      <span className="shrink-0 rounded-full border border-[#ececec] px-2.5 py-0.5 text-xs text-[#aaa]">
                        {song.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="mt-8 text-center text-xs text-[#e0e0e0]">Anfiora</p>
        </div>
      </div>

    </div>
  )
}