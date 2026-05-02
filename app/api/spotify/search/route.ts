import { NextRequest, NextResponse } from 'next/server'

let cachedToken: string | null = null
let tokenExpiry: number = 0

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken!
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const token = await getSpotifyToken()
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=6&market=MX`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()

    const tracks = (data.tracks?.items || []).map((item: any) => ({
      id: item.id,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      album: item.album.name,
      thumbnail: item.album.images?.[1]?.url || item.album.images?.[0]?.url || null,
      spotify_url: item.external_urls.spotify,
      duration_ms: item.duration_ms,
      preview_url: item.preview_url || null,
    }))

    return NextResponse.json({ tracks })
  } catch (err) {
    return NextResponse.json({ tracks: [], error: 'Error buscando en Spotify' }, { status: 500 })
  }
}